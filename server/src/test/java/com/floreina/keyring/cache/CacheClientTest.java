package com.floreina.keyring.cache;

import com.floreina.keyring.Cryptography;
import com.google.gson.Gson;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import redis.embedded.RedisServer;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CacheClientTest {
  private static RedisServer redisServer;
  private static JedisPool jedisPool;
  private static Gson gson;
  @Mock private Cryptography mockCryptography;
  private CacheClient cacheClient;

  @BeforeAll
  static void beforeAll() throws IOException {
    gson = new Gson();
    redisServer = new RedisServer();
    redisServer.start();
    jedisPool = new JedisPool(new JedisPoolConfig(), "localhost");
  }

  @AfterAll
  static void afterAll() {
    redisServer.stop();
  }

  @BeforeEach
  void beforeEach() {
    cacheClient = new CacheClient(jedisPool, mockCryptography, gson);
  }

  @Test
  void create_getsUniqueIdentifier_putsSessionToUser() {
    String identifier = generateUniqueIdentifier();
    when(mockCryptography.generateSessionKey()).thenReturn(identifier);

    Optional<String> reply = cacheClient.create(new UserCast().setIdentifier(0L));

    assertEquals(identifier, reply.get());
    assertEquals(0L, cacheClient.readAndUpdateExpirationTime(identifier).get().getIdentifier());
  }

  @Test
  void create_getsDuplicateIdentifier_returnsEmpty() {
    String identifier = generateUniqueIdentifier();
    when(mockCryptography.generateSessionKey()).thenReturn(identifier);
    cacheClient.create(new UserCast().setIdentifier(0L));

    assertFalse(cacheClient.create(new UserCast().setIdentifier(1L)).isPresent());
  }

  @Test
  void readAndUpdateExpirationTime_noSuchIdentifier_returnsEmpty() {
    String identifier = generateUniqueIdentifier();

    assertFalse(cacheClient.readAndUpdateExpirationTime(identifier).isPresent());
  }

  @Test
  void readAndUpdateExpirationTime_findsIdentifier_updatesExpirationTime() throws Exception {
    try (Jedis jedis = jedisPool.getResource()) {
      String identifier = generateUniqueIdentifier();
      when(mockCryptography.generateSessionKey()).thenReturn(identifier);
      cacheClient.create(new UserCast().setIdentifier(0L));
      Thread.sleep(10);
      long ttlBefore = jedis.pttl(identifier);

      Optional<UserCast> reply = cacheClient.readAndUpdateExpirationTime(identifier);
      long ttlAfter = jedis.pttl(identifier);

      assertEquals(0L, reply.get().getIdentifier());
      assertTrue(ttlAfter > ttlBefore);
    }
  }

  private String generateUniqueIdentifier() {
    return UUID.randomUUID().toString();
  }
}
