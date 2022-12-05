package keyring.server.main.interceptors;

import io.grpc.Context;
import io.grpc.Metadata;
import keyring.server.main.keyvalue.UserPointer;

public class SessionAccessor {
  static final Metadata.Key<String> METADATA_SESSION_TOKEN_KEY =
      Metadata.Key.of("X-Session-Token", Metadata.ASCII_STRING_MARSHALLER);

  static final Context.Key<UserPointer> CONTEXT_USER_POINTER_KEY = Context.key("user-pointer");
  static final Context.Key<String> CONTEXT_SESSION_TOKEN_KEY = Context.key("session-token");

  public String getSessionIdentifier() {
    return CONTEXT_SESSION_TOKEN_KEY.get();
  }

  public long getUserIdentifier() {
    return CONTEXT_USER_POINTER_KEY.get().getIdentifier();
  }
}
