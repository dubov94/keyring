package com.floreina.keyring.interceptors;

import io.grpc.Context;
import io.grpc.Metadata;

public class VersionInterceptorKeys {
  static final Context.Key<String> CONTEXT_CLIENT_VERSION_KEY = Context.key("client-version");
  static final Metadata.Key<String> METADATA_CLIENT_VERSION_KEY =
      Metadata.Key.of("X-Client-Version", Metadata.ASCII_STRING_MARSHALLER);
}
