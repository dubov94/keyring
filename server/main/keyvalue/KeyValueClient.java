package keyring.server.main.keyvalue;

import com.google.gson.Gson;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import keyring.server.main.Chronometry;
import keyring.server.main.Cryptography;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.params.GetExParams;
import redis.clients.jedis.params.SetParams;
import redis.clients.jedis.util.Pool;

public class KeyValueClient {
  private static final int SESSION_RELATIVE_DURATION_S = 10 * 60;
  private static final int SESSION_ABSOLUTE_DURATION_H = 2;
  private static final int AUTHN_DURATION_S = 5 * 60;

  private Pool<Jedis> jedisPool;
  private Cryptography cryptography;
  private Gson gson;
  private Chronometry chronometry;

  @Inject
  KeyValueClient(
      Pool<Jedis> jedisPool, Cryptography cryptography, Gson gson, Chronometry chronometry) {
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
              new SetParams().nx().ex(SESSION_RELATIVE_DURATION_S));
      if (status == null) {
        throw new KeyValueException("https://redis.io/topics/protocol#nil-reply");
      }
      return sessionId;
    }
  }

  public Optional<UserPointer> touchSession(String sessionIdentifier) {
    try (Jedis jedis = jedisPool.getResource()) {
      String sessionKey = convertSessionIdToKey(sessionIdentifier);
      Optional<String> maybeUserPointer =
          Optional.ofNullable(
              jedis.getEx(sessionKey, new GetExParams().ex(SESSION_RELATIVE_DURATION_S)));
      return maybeUserPointer
          .map(string -> gson.fromJson(string, UserPointer.class))
          .map(
              userPointer ->
                  chronometry.isBefore(
                          userPointer.getCreationTime(),
                          chronometry.subtract(
                              chronometry.currentTime(),
                              SESSION_ABSOLUTE_DURATION_H,
                              ChronoUnit.HOURS))
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
              new SetParams().nx().ex(AUTHN_DURATION_S));
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

  public void dropAuthn(String authnId) {
    try (Jedis jedis = jedisPool.getResource()) {
      jedis.del(convertAuthnIdToKey(authnId));
    }
  }

  private String convertAuthnIdToKey(String authnId) {
    return String.format("authn:%s", authnId);
  }
}
