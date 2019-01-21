package com.floreina.keyring.interceptors;

import com.floreina.keyring.keyvalue.UserProjection;
import io.grpc.Context;
import io.grpc.Metadata;

public class SessionInterceptorKeys {
  static final Context.Key<UserProjection> CONTEXT_USER_PROJECTION_KEY =
      Context.key("user-projection");
  static final Context.Key<String> CONTEXT_SESSION_TOKEN_KEY = Context.key("session-token");
  static final Metadata.Key<String> METADATA_SESSION_TOKEN_KEY =
      Metadata.Key.of("X-Session-Token", Metadata.ASCII_STRING_MARSHALLER);

  public String getSessionIdentifier() {
    return CONTEXT_SESSION_TOKEN_KEY.get();
  }

  public long getUserIdentifier() {
    return CONTEXT_USER_PROJECTION_KEY.get().getIdentifier();
  }
}
