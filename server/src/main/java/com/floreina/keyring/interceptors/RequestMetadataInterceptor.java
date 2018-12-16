package com.floreina.keyring.interceptors;

import io.grpc.*;

public class RequestMetadataInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    context =
        context.withValue(
            RequestMetadataInterceptorKeys.CONTEXT_IP_ADDRESS_KEY,
            metadata.get(RequestMetadataInterceptorKeys.METADATA_IP_ADDRESS_KEY));
    context =
        context.withValue(
            RequestMetadataInterceptorKeys.CONTEXT_USER_AGENT_KEY,
            metadata.get(RequestMetadataInterceptorKeys.METADATA_USER_AGENT_KEY));
    return Contexts.interceptCall(context, call, metadata, next);
  }
}
