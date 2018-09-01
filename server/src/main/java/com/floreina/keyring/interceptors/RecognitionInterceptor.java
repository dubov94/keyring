package com.floreina.keyring.interceptors;

import io.grpc.*;

public class RecognitionInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    context.withValue(
        RecognitionKeys.CONTEXT_IP_ADDRESS_KEY,
        metadata.get(RecognitionKeys.METADATA_IP_ADDRESS_KEY));
    context.withValue(
        RecognitionKeys.CONTEXT_USER_AGENT_KEY,
        metadata.get(RecognitionKeys.METADATA_USER_AGENT_KEY));
    return Contexts.interceptCall(context, call, metadata, next);
  }
}
