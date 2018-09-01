package com.floreina.keyring.interceptors;

import io.grpc.*;

public class AddressInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    context.withValue(
        AddressKeys.CONTEXT_ADDRESS_KEY, metadata.get(AddressKeys.METADATA_IP_ADDRESS_KEY));
    return Contexts.interceptCall(context, call, metadata, next);
  }
}
