package server.main.interceptors;

import io.grpc.Context;
import io.grpc.Metadata;

public class VersionAccessor {
  static final Context.Key<String> CONTEXT_CLIENT_VERSION_KEY = Context.key("client-version");

  static final Metadata.Key<String> METADATA_CLIENT_VERSION_KEY =
      Metadata.Key.of("X-Client-Version", Metadata.ASCII_STRING_MARSHALLER);
}
