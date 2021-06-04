package server.main.keyvalue;

import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.Response;
import redis.clients.jedis.Transaction;
import server.main.Chronometry;
import server.main.Cryptography;

public class KeyValueClient {
  private static final int SESSION_LIFETIME_S = 10 * 60;
  private static final int AUTHN_LIFETIME_S = 5 * 60;

  private static final ImmutableMap<SetPresenceConstraint, String>
      SET_PRESENCE_CONSTRAINT_TO_PARAMETER_VALUE =
          new ImmutableMap.Builder<SetPresenceConstraint, String>()
              .put(SetPresenceConstraint.MUST_ABSENT, "nx")
              .put(SetPresenceConstraint.MUST_EXIST, "xx")
              .build();
  private static final ImmutableMap<SetExpirationUnit, String>
      SET_EXPIRATION_UNIT_TO_PARAMETER_VALUE =
          new ImmutableMap.Builder<SetExpirationUnit, String>()
              .put(SetExpirationUnit.SECONDS, "ex")
              .put(SetExpirationUnit.MILLISECONDS, "px")
              .build();

  private JedisPool jedisPool;
  private Cryptography cryptography;
  private Gson gson;
  private Chronometry chronometry;

  @Inject
  KeyValueClient(
      JedisPool jedisPool, Cryptography cryptography, Gson gson, Chronometry chronometry) {
    this.jedisPool = jedisPool;
    this.cryptography = cryptography;
    this.gson = gson;
    this.chronometry = chronometry;
  }

  public String createSession(UserPointer userPointer) {
    String sessionId = cryptography.generateTts();
    try (Jedis jedis = jedisPool.getResource()) {
      String status =
          jedis.set(
              convertSessionIdToKey(sessionId),
              gson.toJson(userPointer.setCreationTimeInMs(chronometry.currentTime())),
              SET_PRESENCE_CONSTRAINT_TO_PARAMETER_VALUE.get(SetPresenceConstraint.MUST_ABSENT),
              SET_EXPIRATION_UNIT_TO_PARAMETER_VALUE.get(SetExpirationUnit.SECONDS),
              SESSION_LIFETIME_S);
      if (status == null) {
        throw new KeyValueException("https://redis.io/topics/protocol#nil-reply");
      }
      return sessionId;
    }
  }

  public Optional<UserPointer> getSessionAndUpdateItsExpirationTime(String sessionIdentifier) {
    try (Jedis jedis = jedisPool.getResource()) {
      String key = convertSessionIdToKey(sessionIdentifier);
      Transaction transaction = jedis.multi();
      transaction.expire(key, SESSION_LIFETIME_S);
      Response<String> userPointerString = transaction.get(key);
      transaction.exec();
      return Optional.ofNullable(userPointerString.get())
          .map(string -> gson.fromJson(string, UserPointer.class))
          .map(
              userPointer ->
                  chronometry.isBefore(
                          userPointer.getCreationTime(),
                          chronometry.subtract(chronometry.currentTime(), 1, ChronoUnit.HOURS))
                      ? null
                      : userPointer);
    }
  }

  public void dropSessions(List<String> identifierList) {
    try (Jedis jedis = jedisPool.getResource()) {
      jedis.del(identifierList.stream().map(this::convertSessionIdToKey).toArray(String[]::new));
    }
  }

  private String convertSessionIdToKey(String sessionId) {
    return String.format("session:%s", sessionId);
  }

  public String createAuthn(long userId) {
    String authnId = cryptography.generateTts();
    try (Jedis jedis = jedisPool.getResource()) {
      String status =
          jedis.set(
              convertAuthnIdToKey(authnId),
              String.valueOf(userId),
              SET_PRESENCE_CONSTRAINT_TO_PARAMETER_VALUE.get(SetPresenceConstraint.MUST_ABSENT),
              SET_EXPIRATION_UNIT_TO_PARAMETER_VALUE.get(SetExpirationUnit.SECONDS),
              AUTHN_LIFETIME_S);
      if (status == null) {
        throw new KeyValueException("https://redis.io/topics/protocol#nil-reply");
      }
      return authnId;
    }
  }

  public Optional<Long> getUserByAuthn(String authnId) {
    try (Jedis jedis = jedisPool.getResource()) {
      String authnKey = convertAuthnIdToKey(authnId);
      return Optional.ofNullable(jedis.get(authnKey)).map(Long::valueOf);
    }
  }

  private String convertAuthnIdToKey(String authnId) {
    return String.format("authn:%s", authnId);
  }

  private enum SetPresenceConstraint {
    MUST_ABSENT,
    MUST_EXIST
  }

  private enum SetExpirationUnit {
    MILLISECONDS,
    SECONDS
  }
}
