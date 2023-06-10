package keyring.server.main.keyvalue;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import keyring.server.main.Arithmetic;
import keyring.server.main.Chronometry;
import keyring.server.main.keyvalue.values.KvAuthn;
import keyring.server.main.keyvalue.values.KvSession;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

  private static final String IP_ADDRESS = "127.0.0.1";

  private static JedisPool jedisPool;
  private KeyValueClient keyValueClient;

  @BeforeEach
  void beforeEach() {
    jedisPool =
        new JedisPool(
            new JedisPoolConfig(), redisContainer.getHost(), redisContainer.getFirstMappedPort());
    keyValueClient =
        new KeyValueClient(jedisPool, new Chronometry(new Arithmetic(), () -> Instant.EPOCH));
  }

  @Test
  void createSession_getsUniqueToken_putsKeyToKvSession() {
    String sessionToken = generateUniqueToken();

    KvSession kvSession = keyValueClient.createSession(sessionToken, 1L, IP_ADDRESS, 7L);

    assertEquals(sessionToken, kvSession.getSessionToken());
    assertEquals(1L, kvSession.getUserId());
    assertEquals(7L, kvSession.getSessionEntityId());
    assertEquals(Optional.of(kvSession), keyValueClient.getExKvSession(sessionToken, IP_ADDRESS));
  }

  @Test
  void createSession_getsDuplicateToken_throwsException() {
    String sessionToken = generateUniqueToken();
    keyValueClient.createSession(sessionToken, 1L, IP_ADDRESS, 7L);

    KeyValueException exception =
        assertThrows(
            KeyValueException.class,
            () -> keyValueClient.createSession(sessionToken, 2L, IP_ADDRESS, 14L));

    assertTrue(exception.getMessage().endsWith("#nil-reply"));
  }

  @Test
  void getExKvSession_noSuchToken_returnsEmpty() {
    assertFalse(keyValueClient.getExKvSession(generateUniqueToken(), IP_ADDRESS).isPresent());
  }

  @Test
  void getExKvSession_ipMismatch_returnsEmpty() {
    try (Jedis jedis = jedisPool.getResource()) {
      String sessionToken = generateUniqueToken();
      keyValueClient.createSession(sessionToken, 1L, IP_ADDRESS, 7L);

      assertFalse(keyValueClient.getExKvSession(sessionToken, "0.0.0.0").isPresent());
    }
  }

  @Test
  void getExKvSession_findsToken_updatesExpirationTime() throws Exception {
    try (Jedis jedis = jedisPool.getResource()) {
      String sessionToken = generateUniqueToken();
      keyValueClient.createSession(sessionToken, 1L, IP_ADDRESS, 7L);
      Thread.sleep(8 + 2);
      long ttlBefore = jedis.pttl("session:" + sessionToken);

      Optional<KvSession> storedKvSession = keyValueClient.getExKvSession(sessionToken, IP_ADDRESS);
      long ttlAfter = jedis.pttl("session:" + sessionToken);

      assertEquals(1L, storedKvSession.get().getUserId());
      assertTrue(ttlAfter > ttlBefore);
    }
  }

  @Test
  void createAuthn_getsUniqueToken_putsKeyToKvAuthn() {
    String authnToken = generateUniqueToken();

    KvAuthn kvAuthn = keyValueClient.createAuthn(authnToken, 1L, IP_ADDRESS, 7L);

    assertEquals(authnToken, kvAuthn.getAuthnToken());
    assertEquals(1L, kvAuthn.getUserId());
    assertEquals(7L, kvAuthn.getSessionEntityId());
    assertEquals(Optional.of(kvAuthn), keyValueClient.getKvAuthn(authnToken, IP_ADDRESS));
  }

  @Test
  void getKvAuthn_ipMismatch_returnsEmpty() {
    try (Jedis jedis = jedisPool.getResource()) {
      String authnToken = generateUniqueToken();
      keyValueClient.createAuthn(authnToken, 1L, IP_ADDRESS, 7L);

      assertFalse(keyValueClient.getKvAuthn(authnToken, "0.0.0.0").isPresent());
    }
  }

  private String generateUniqueToken() {
    return UUID.randomUUID().toString();
  }
}
