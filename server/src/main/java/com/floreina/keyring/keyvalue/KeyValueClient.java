package com.floreina.keyring.keyvalue;

import com.floreina.keyring.Cryptography;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.Response;
import redis.clients.jedis.Transaction;

import javax.inject.Inject;
import java.util.List;
import java.util.Optional;

public class KeyValueClient {
  private static final int SESSION_LIFETIME_IN_SECONDS = 5 * 60;
  private static final ImmutableMap<SettingStrategy, String> SETTING_STRATEGY_TO_PARAMETER =
      new ImmutableMap.Builder<SettingStrategy, String>()
          .put(SettingStrategy.MUST_ABSENT, "nx")
          .put(SettingStrategy.MUST_EXIST, "xx")
          .build();
  private JedisPool jedisPool;
  private Cryptography cryptography;
  private Gson gson;

  @Inject
  KeyValueClient(JedisPool jedisPool, Cryptography cryptography, Gson gson) {
    this.jedisPool = jedisPool;
    this.cryptography = cryptography;
    this.gson = gson;
  }

  private Optional<String> set(
      SettingStrategy settingStrategy, String sessionIdentifier, UserProjection userProjection) {
    try (Jedis jedis = jedisPool.getResource()) {
      String value =
          jedis.set(
              sessionIdentifier,
              gson.toJson(userProjection),
              SETTING_STRATEGY_TO_PARAMETER.get(settingStrategy),
              "ex",
              SESSION_LIFETIME_IN_SECONDS);
      return value == null ? Optional.empty() : Optional.of(sessionIdentifier);
    }
  }

  public Optional<String> createSession(UserProjection userProjection) {
    String sessionIdentifier = cryptography.generateSessionKey();
    return set(SettingStrategy.MUST_ABSENT, sessionIdentifier, userProjection);
  }

  public Optional<UserProjection> getSessionAndUpdateItsExpirationTime(String sessionIdentifier) {
    try (Jedis jedis = jedisPool.getResource()) {
      Transaction transaction = jedis.multi();
      transaction.expire(sessionIdentifier, SESSION_LIFETIME_IN_SECONDS);
      Response<String> userIdentifier = transaction.get(sessionIdentifier);
      transaction.exec();
      return Optional.ofNullable(userIdentifier.get())
          .map(string -> gson.fromJson(string, UserProjection.class));
    }
  }

  public void dropSessions(List<String> identifierList) {
    try (Jedis jedis = jedisPool.getResource()) {
      jedis.del(identifierList.stream().toArray(String[]::new));
    }
  }

  private enum SettingStrategy {
    MUST_ABSENT,
    MUST_EXIST
  }
}
