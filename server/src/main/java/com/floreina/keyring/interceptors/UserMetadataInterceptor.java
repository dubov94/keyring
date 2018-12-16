package com.floreina.keyring.interceptors;

import io.grpc.*;

public class UserMetadataInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    context =
        context.withValue(
            UserMetadataKeys.CONTEXT_IP_ADDRESS_KEY,
            metadata.get(UserMetadataKeys.METADATA_IP_ADDRESS_KEY));
    context =
        context.withValue(
            UserMetadataKeys.CONTEXT_USER_AGENT_KEY,
            metadata.get(UserMetadataKeys.METADATA_USER_AGENT_KEY));
    return Contexts.interceptCall(context, call, metadata, next);
  }
}
