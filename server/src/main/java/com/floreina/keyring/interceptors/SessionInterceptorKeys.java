package com.floreina.keyring.interceptors;

import com.floreina.keyring.keyvalue.UserCast;
import io.grpc.Context;
import io.grpc.Metadata;

public class SessionInterceptorKeys {
  static final Context.Key<UserCast> CONTEXT_USER_CAST_KEY = Context.key("user");
  static final Context.Key<String> CONTEXT_SESSION_IDENTIFIER_KEY = Context.key("session");
  static final Metadata.Key<String> METADATA_SESSION_IDENTIFIER_KEY =
      Metadata.Key.of("session", Metadata.ASCII_STRING_MARSHALLER);

  public String getSessionIdentifier() {
    return CONTEXT_SESSION_IDENTIFIER_KEY.get();
  }

  public long getUserIdentifier() {
    return CONTEXT_USER_CAST_KEY.get().getIdentifier();
  }
}
