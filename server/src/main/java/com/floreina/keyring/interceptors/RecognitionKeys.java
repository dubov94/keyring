package com.floreina.keyring.interceptors;

import io.grpc.Context;
import io.grpc.Metadata;

public class RecognitionKeys {
  static final Context.Key<String> CONTEXT_ADDRESS_KEY = Context.key("address");
  static final Metadata.Key<String> METADATA_IP_ADDRESS_KEY =
      Metadata.Key.of("ip-address", Metadata.ASCII_STRING_MARSHALLER);

  public String getAddress() {
    return CONTEXT_ADDRESS_KEY.get();
  }
}
