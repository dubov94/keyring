package server.main.keyvalue;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import server.main.Chronometry;
import server.main.Cryptography;

@ExtendWith(MockitoExtension.class)
@Testcontainers
class KeyValueClientTest {
  @Container
  public GenericContainer redisContainer =
      new GenericContainer(DockerImageName.parse("redis")).withExposedPorts(6379);

  private static JedisPool jedisPool;
  private static Gson gson;
  @Mock private Cryptography mockCryptography;
  @Mock private Chronometry mockChronometry;
  private KeyValueClient keyValueClient;

  @BeforeEach
  void beforeEach() {
    jedisPool =
        new JedisPool(
            new JedisPoolConfig(), redisContainer.getHost(), redisContainer.getFirstMappedPort());
    gson = new Gson();
    keyValueClient = new KeyValueClient(jedisPool, mockCryptography, gson, mockChronometry);
    when(mockChronometry.currentTime()).thenReturn(Instant.EPOCH);
    when(mockChronometry.isBefore(eq(Instant.EPOCH), any(Instant.class))).thenReturn(false);
  }

  @Test
  void createSession_getsUniqueIdentifier_putsSessionToUser() {
    String identifier = generateUniqueIdentifier();
    when(mockCryptography.generateTts()).thenReturn(identifier);

    String reply = keyValueClient.createSession(new UserPointer().setIdentifier(0L));

    assertEquals(identifier, reply);
    assertEquals(
        0L, keyValueClient.touchSession(identifier).get().getIdentifier());
  }

  @Test
  void createSession_getsDuplicateIdentifier_throwsException() {
    String identifier = generateUniqueIdentifier();
    when(mockCryptography.generateTts()).thenReturn(identifier);
    keyValueClient.createSession(new UserPointer().setIdentifier(0L));

    assertThrows(
        KeyValueException.class,
        () -> keyValueClient.createSession(new UserPointer().setIdentifier(1L)));
  }

  @Test
  void touchSession_noSuchIdentifier_returnsEmpty() {
    String identifier = generateUniqueIdentifier();

    assertFalse(keyValueClient.touchSession(identifier).isPresent());
  }

  @Test
  void touchSession_findsIdentifier_updatesExpirationTime()
      throws Exception {
    try (Jedis jedis = jedisPool.getResource()) {
      String identifier = generateUniqueIdentifier();
      when(mockCryptography.generateTts()).thenReturn(identifier);
      keyValueClient.createSession(new UserPointer().setIdentifier(0L));
      Thread.sleep(10);
      long ttlBefore = jedis.pttl("session:" + identifier);

      Optional<UserPointer> reply = keyValueClient.touchSession(identifier);
      long ttlAfter = jedis.pttl("session:" + identifier);

      assertEquals(0L, reply.get().getIdentifier());
      assertTrue(ttlAfter > ttlBefore);
    }
  }

  @Test
  void createAuthn_getsUniqueId_putsAuthnToUserId() {
    String authnId = generateUniqueIdentifier();
    when(mockCryptography.generateTts()).thenReturn(authnId);

    String reply = keyValueClient.createAuthn(7L);

    assertEquals(authnId, reply);
    assertEquals(Optional.of(7L), keyValueClient.getUserByAuthn(authnId));
  }

  private String generateUniqueIdentifier() {
    return UUID.randomUUID().toString();
  }
}
