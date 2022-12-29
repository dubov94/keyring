package keyring.server.main.keyvalue;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import keyring.server.main.Chronometry;
import keyring.server.main.keyvalue.values.KvAuthn;
import keyring.server.main.keyvalue.values.KvSession;
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

@ExtendWith(MockitoExtension.class)
@Testcontainers
class KeyValueClientTest {
  @Container
  public GenericContainer redisContainer =
      new GenericContainer(DockerImageName.parse("redis")).withExposedPorts(6379);

  private static JedisPool jedisPool;
  @Mock private Chronometry mockChronometry;
  private KeyValueClient keyValueClient;

  @BeforeEach
  void beforeEach() {
    jedisPool =
        new JedisPool(
            new JedisPoolConfig(), redisContainer.getHost(), redisContainer.getFirstMappedPort());
    keyValueClient = new KeyValueClient(jedisPool, mockChronometry);
    when(mockChronometry.currentTime()).thenReturn(Instant.EPOCH);
    when(mockChronometry.isBefore(eq(Instant.EPOCH), any(Instant.class))).thenReturn(false);
  }

  @Test
  void createSession_getsUniqueToken_putsKeyToKvSession() {
    String sessionToken = generateUniqueToken();

    KvSession kvSession = keyValueClient.createSession(sessionToken, 1L, 7L);

    assertEquals(sessionToken, kvSession.getSessionToken());
    assertEquals(1L, kvSession.getUserId());
    assertEquals(7L, kvSession.getSessionEntityId());
    assertEquals(Optional.of(kvSession), keyValueClient.getExSession(sessionToken));
  }

  @Test
  void createSession_getsDuplicateToken_throwsException() {
    String sessionToken = generateUniqueToken();
    keyValueClient.createSession(sessionToken, 1L, 7L);

    assertThrows(
        KeyValueException.class, () -> keyValueClient.createSession(sessionToken, 2L, 14L));
  }

  @Test
  void getExSession_noSuchToken_returnsEmpty() {
    assertFalse(keyValueClient.getExSession(generateUniqueToken()).isPresent());
  }

  @Test
  void getExSession_findToken_updatesExpirationTime() throws Exception {
    try (Jedis jedis = jedisPool.getResource()) {
      String sessionToken = generateUniqueToken();
      keyValueClient.createSession(sessionToken, 1L, 7L);
      Thread.sleep(8 + 2);
      long ttlBefore = jedis.pttl("session:" + sessionToken);

      Optional<KvSession> storedKvSession = keyValueClient.getExSession(sessionToken);
      long ttlAfter = jedis.pttl("session:" + sessionToken);

      assertEquals(1L, storedKvSession.get().getUserId());
      assertTrue(ttlAfter > ttlBefore);
    }
  }

  @Test
  void createAuthn_getsUniqueToken_putsKeyToKvAuthn() {
    String authnToken = generateUniqueToken();

    KvAuthn kvAuthn = keyValueClient.createAuthn(authnToken, 1L, 7L);

    assertEquals(authnToken, kvAuthn.getAuthnToken());
    assertEquals(1L, kvAuthn.getUserId());
    assertEquals(7L, kvAuthn.getSessionEntityId());
    assertEquals(Optional.of(kvAuthn), keyValueClient.getKvAuthn(authnToken));
  }

  private String generateUniqueToken() {
    return UUID.randomUUID().toString();
  }
}
