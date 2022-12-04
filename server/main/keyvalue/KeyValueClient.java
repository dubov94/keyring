package keyring.server.main.keyvalue;

import com.google.protobuf.InvalidProtocolBufferException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import keyring.server.main.Chronometry;
import keyring.server.main.entities.Session;
import keyring.server.main.keyvalue.values.KvAuthn;
import keyring.server.main.keyvalue.values.KvSession;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.params.GetExParams;
import redis.clients.jedis.params.SetParams;
import redis.clients.jedis.util.Pool;

public class KeyValueClient {
  private static final int SESSION_RELATIVE_DURATION_S = 10 * 60;
  private static final int SESSION_ABSOLUTE_DURATION_H = 2;
  private static final int AUTHN_DURATION_S = 5 * 60;

  private Pool<Jedis> jedisPool;
  private Chronometry chronometry;
  private Base64.Encoder base64Encoder;
  private Base64.Decoder base64Decoder;

  @Inject
  KeyValueClient(Pool<Jedis> jedisPool, Chronometry chronometry) {
    this.jedisPool = jedisPool;
    this.chronometry = chronometry;
    this.base64Encoder = Base64.getEncoder();
    this.base64Decoder = Base64.getDecoder();
  }

  public KvSession createSession(String sessionToken, long userId, long sessionEntityId) {
    KvSession kvSession =
        KvSession.newBuilder()
            .setSessionToken(sessionToken)
            .setCreationTimeMillis(chronometry.currentTime().toEpochMilli())
            .setUserId(userId)
            .setSessionEntityId(sessionEntityId)
            .build();
    try (Jedis jedis = jedisPool.getResource()) {
      String status =
          jedis.set(
              convertSessionTokenToKey(sessionToken),
              base64Encoder.encodeToString(kvSession.toByteArray()),
              new SetParams().nx().ex(SESSION_RELATIVE_DURATION_S));
      if (status == null) {
        throw new KeyValueException("https://redis.io/topics/protocol#nil-reply");
      }
      return kvSession;
    }
  }

  public Optional<KvSession> getExSession(String sessionToken) {
    try (Jedis jedis = jedisPool.getResource()) {
      String sessionKey = convertSessionTokenToKey(sessionToken);
      Optional<String> serializedKvSession =
          Optional.ofNullable(
              jedis.getEx(sessionKey, new GetExParams().ex(SESSION_RELATIVE_DURATION_S)));
      return serializedKvSession
          .map(
              string -> {
                try {
                  return KvSession.parseFrom(base64Decoder.decode(string));
                } catch (InvalidProtocolBufferException e) {
                  throw new KeyValueException(e);
                }
              })
          .map(
              kvSession ->
                  chronometry.isBefore(
                          Instant.ofEpochMilli(kvSession.getCreationTimeMillis()),
                          chronometry.subtract(
                              chronometry.currentTime(),
                              SESSION_ABSOLUTE_DURATION_H,
                              ChronoUnit.HOURS))
                      ? null
                      : kvSession);
    }
  }

  private String convertSessionTokenToKey(String sessionToken) {
    return String.format("session:%s", sessionToken);
  }

  public KvAuthn createAuthn(String authnToken, long userId, long sessionEntityId) {
    KvAuthn kvAuthn =
        KvAuthn.newBuilder()
            .setAuthnToken(authnToken)
            .setCreationTimeMillis(chronometry.currentTime().toEpochMilli())
            .setUserId(userId)
            .setSessionEntityId(sessionEntityId)
            .build();
    try (Jedis jedis = jedisPool.getResource()) {
      String status =
          jedis.set(
              convertAuthnTokenToKey(authnToken),
              base64Encoder.encodeToString(kvAuthn.toByteArray()),
              new SetParams().nx().ex(AUTHN_DURATION_S));
      if (status == null) {
        throw new KeyValueException("https://redis.io/topics/protocol#nil-reply");
      }
      return kvAuthn;
    }
  }

  public Optional<KvAuthn> getKvAuthn(String authnToken) {
    try (Jedis jedis = jedisPool.getResource()) {
      String authnKey = convertAuthnTokenToKey(authnToken);
      return Optional.ofNullable(jedis.get(authnKey))
          .map(
              string -> {
                try {
                  return KvAuthn.parseFrom(base64Decoder.decode(string));
                } catch (InvalidProtocolBufferException exception) {
                  throw new KeyValueException(exception);
                }
              });
    }
  }

  public void deleteAuthn(String authnToken) {
    try (Jedis jedis = jedisPool.getResource()) {
      jedis.del(convertAuthnTokenToKey(authnToken));
    }
  }

  private String convertAuthnTokenToKey(String authnToken) {
    return String.format("authn:%s", authnToken);
  }

  private String newEncodedKvAuthnBlock(String token) {
    return base64Encoder.encodeToString(
        KvAuthn.newBuilder()
            .setAuthnToken(token)
            .setUserId(-1L)
            .setSessionEntityId(-1L)
            .build()
            .toByteArray());
  }

  private String newEncodedKvSessionBlock(String token) {
    return base64Encoder.encodeToString(
        KvSession.newBuilder()
            .setSessionToken(token)
            .setUserId(-1L)
            .setSessionEntityId(-1L)
            .build()
            .toByteArray());
  }

  public void safelyDeleteSeRefs(List<Session> entities) {
    // `SET` in case `Session` has not been written yet.
    SetParams setParams = new SetParams().ex(60);

    try (Jedis jedis = jedisPool.getResource()) {
      for (Session entity : entities) {
        switch (entity.getStage()) {
          case INITIATED:
            String authnToken = convertAuthnTokenToKey(entity.getKey());
            jedis.set(authnToken, newEncodedKvAuthnBlock(authnToken), setParams);
            break;
          case ACTIVATED:
            String sessionToken = convertSessionTokenToKey(entity.getKey());
            jedis.set(sessionToken, newEncodedKvSessionBlock(sessionToken), setParams);
            break;
          case UNKNOWN_SESSION_STAGE:
            break;
          default:
            throw new IllegalArgumentException();
        }
      }
    }
  }
}
