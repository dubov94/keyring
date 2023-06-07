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
  private static final String NIL_DOCS_URL =
      "https://redis.io/docs/reference/protocol-spec/#nil-reply";
  private static final String DELETED_VALUE = "";

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

  public String convertSessionTokenToKey(String sessionToken) {
    return String.format("session:%s", sessionToken);
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
              new SetParams().nx().ex(Session.SESSION_RELATIVE_DURATION_M * 60));
      if (status == null) {
        throw new KeyValueException(NIL_DOCS_URL);
      }
      return kvSession;
    }
  }

  public Optional<KvSession> getExKvSession(String sessionToken) {
    try (Jedis jedis = jedisPool.getResource()) {
      String sessionKey = convertSessionTokenToKey(sessionToken);
      Optional<String> serializedKvSession =
          Optional.ofNullable(
              jedis.getEx(
                  sessionKey, new GetExParams().ex(Session.SESSION_RELATIVE_DURATION_M * 60)));
      return serializedKvSession
          .map(
              string -> {
                try {
                  if (DELETED_VALUE.equals(string)) {
                    throw new KeyValueException("`KvSession` has been deleted");
                  }
                  return KvSession.parseFrom(base64Decoder.decode(string));
                } catch (InvalidProtocolBufferException exception) {
                  throw new KeyValueException(exception);
                }
              })
          .map(
              kvSession ->
                  chronometry.isBefore(
                          Instant.ofEpochMilli(kvSession.getCreationTimeMillis()),
                          chronometry.subtract(
                              chronometry.currentTime(),
                              Session.SESSION_ABSOLUTE_DURATION_H,
                              ChronoUnit.HOURS))
                      ? null
                      : kvSession);
    }
  }

  public String convertAuthnTokenToKey(String authnToken) {
    return String.format("authn:%s", authnToken);
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
              new SetParams().nx().ex(Session.SESSION_AUTHN_EXPIRATION_M * 60));
      if (status == null) {
        throw new KeyValueException(NIL_DOCS_URL);
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
                  if (DELETED_VALUE.equals(string)) {
                    throw new KeyValueException("`KvAuthn` has been deleted");
                  }
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

  public void safelyDeleteSeRefs(List<Session> entities) {
    // `SET` in case a `Session` has already been saved into RDBMS, but its
    // reference (`KvAuthn` or `KvSession`) has not been written yet due to a
    // race condition.
    SetParams setParams = new SetParams().ex(60);

    try (Jedis jedis = jedisPool.getResource()) {
      for (Session entity : entities) {
        Optional<String> maybeKey = Optional.ofNullable(entity.getKey());
        if (maybeKey.isPresent()) {
          jedis.set(maybeKey.get(), DELETED_VALUE, setParams);
        }
      }
    }
  }
}
