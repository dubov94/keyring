package keyring.server.main.interceptors;

import io.grpc.Context;
import io.grpc.Metadata;
import keyring.server.main.keyvalue.values.KvSession;

public class SessionAccessor {
  static final Metadata.Key<String> METADATA_SESSION_TOKEN_KEY =
      Metadata.Key.of("X-Session-Token", Metadata.ASCII_STRING_MARSHALLER);

  static final Context.Key<KvSession> CONTEXT_KV_SESSION_KEY = Context.key("kv-session");
  static final Context.Key<String> CONTEXT_SESSION_TOKEN_KEY = Context.key("session-token");

  public String getSessionToken() {
    return CONTEXT_SESSION_TOKEN_KEY.get();
  }

  public KvSession getKvSession() {
    return CONTEXT_KV_SESSION_KEY.get();
  }

  public long getUserId() {
    return getKvSession().getUserId();
  }

  public long getSessionEntityId() {
    return getKvSession().getSessionEntityId();
  }
}
