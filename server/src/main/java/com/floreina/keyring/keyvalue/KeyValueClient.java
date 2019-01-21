package com.floreina.keyring.keyvalue;

import com.floreina.keyring.Chronometry;
import com.floreina.keyring.Cryptography;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.Response;
import redis.clients.jedis.Transaction;

import javax.inject.Inject;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

public class KeyValueClient {
  private static final int SESSION_LIFETIME_IN_SECONDS = 5 * 60;

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

  public String createSession(UserProjection userProjection) {
    String sessionIdentifier = cryptography.generateSessionKey();
    try (Jedis jedis = jedisPool.getResource()) {
      String status =
          jedis.set(
              convertSessionIdentifierToKey(sessionIdentifier),
              gson.toJson(userProjection.setCreationTimeInMs(chronometry.currentTime())),
              SET_PRESENCE_CONSTRAINT_TO_PARAMETER_VALUE.get(SetPresenceConstraint.MUST_ABSENT),
              SET_EXPIRATION_UNIT_TO_PARAMETER_VALUE.get(SetExpirationUnit.SECONDS),
              SESSION_LIFETIME_IN_SECONDS);
      if (status == null) {
        throw new KeyValueException("Constraint violation");
      } else {
        return sessionIdentifier;
      }
    }
  }

  public Optional<UserProjection> getSessionAndUpdateItsExpirationTime(String sessionIdentifier) {
    try (Jedis jedis = jedisPool.getResource()) {
      String key = convertSessionIdentifierToKey(sessionIdentifier);
      Transaction transaction = jedis.multi();
      transaction.expire(key, SESSION_LIFETIME_IN_SECONDS);
      Response<String> userProjectionString = transaction.get(key);
      transaction.exec();
      return Optional.ofNullable(userProjectionString.get())
          .map(string -> gson.fromJson(string, UserProjection.class))
          .map(
              userProjection ->
                  chronometry.isBefore(
                          userProjection.getCreationTime(),
                          chronometry.subtract(chronometry.currentTime(), 1, ChronoUnit.HOURS))
                      ? null
                      : userProjection);
    }
  }

  public void dropSessions(List<String> identifierList) {
    try (Jedis jedis = jedisPool.getResource()) {
      jedis.del(
          identifierList.stream().map(this::convertSessionIdentifierToKey).toArray(String[]::new));
    }
  }

  private String convertSessionIdentifierToKey(String sessionIdentifier) {
    return String.format("session:%s", sessionIdentifier);
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
