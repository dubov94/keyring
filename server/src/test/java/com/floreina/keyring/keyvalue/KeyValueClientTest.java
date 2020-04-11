package com.floreina.keyring.keyvalue;

import com.floreina.keyring.Chronometry;
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
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static redis.clients.jedis.Protocol.DEFAULT_PORT;

@ExtendWith(MockitoExtension.class)
class KeyValueClientTest {
  // To avoid conflicts with redis-server.service.
  private static int redisPort = DEFAULT_PORT + 1;
  private static RedisServer redisServer;
  private static JedisPool jedisPool;
  private static Gson gson;
  @Mock private Cryptography mockCryptography;
  @Mock private Chronometry mockChronometry;
  private KeyValueClient keyValueClient;

  @BeforeAll
  static void beforeAll() throws IOException {
    gson = new Gson();
    redisServer = new RedisServer(redisPort);
    redisServer.start();
    jedisPool = new JedisPool(new JedisPoolConfig(), "localhost", redisPort);
  }

  @AfterAll
  static void afterAll() {
    redisServer.stop();
  }

  @BeforeEach
  void beforeEach() {
    keyValueClient = new KeyValueClient(jedisPool, mockCryptography, gson, mockChronometry);
    when(mockChronometry.currentTime()).thenReturn(Instant.EPOCH);
    when(mockChronometry.isBefore(eq(Instant.EPOCH), any(Instant.class))).thenReturn(false);
  }

  @Test
  void createSession_getsUniqueIdentifier_putsSessionToUser() {
    String identifier = generateUniqueIdentifier();
    when(mockCryptography.generateSessionKey()).thenReturn(identifier);

    String reply = keyValueClient.createSession(new UserProjection().setIdentifier(0L));

    assertEquals(identifier, reply);
    assertEquals(
        0L, keyValueClient.getSessionAndUpdateItsExpirationTime(identifier).get().getIdentifier());
  }

  @Test
  void createSession_getsDuplicateIdentifier_throwsException() {
    String identifier = generateUniqueIdentifier();
    when(mockCryptography.generateSessionKey()).thenReturn(identifier);
    keyValueClient.createSession(new UserProjection().setIdentifier(0L));

    assertThrows(
        KeyValueException.class,
        () -> keyValueClient.createSession(new UserProjection().setIdentifier(1L)));
  }

  @Test
  void getSessionAndUpdateItsExpirationTime_noSuchIdentifier_returnsEmpty() {
    String identifier = generateUniqueIdentifier();

    assertFalse(keyValueClient.getSessionAndUpdateItsExpirationTime(identifier).isPresent());
  }

  @Test
  void getSessionAndUpdateItsExpirationTime_findsIdentifier_updatesExpirationTime()
      throws Exception {
    try (Jedis jedis = jedisPool.getResource()) {
      String identifier = generateUniqueIdentifier();
      when(mockCryptography.generateSessionKey()).thenReturn(identifier);
      keyValueClient.createSession(new UserProjection().setIdentifier(0L));
      Thread.sleep(10);
      long ttlBefore = jedis.pttl("session:" + identifier);

      Optional<UserProjection> reply =
          keyValueClient.getSessionAndUpdateItsExpirationTime(identifier);
      long ttlAfter = jedis.pttl("session:" + identifier);

      assertEquals(0L, reply.get().getIdentifier());
      assertTrue(ttlAfter > ttlBefore);
    }
  }

  private String generateUniqueIdentifier() {
    return UUID.randomUUID().toString();
  }
}
