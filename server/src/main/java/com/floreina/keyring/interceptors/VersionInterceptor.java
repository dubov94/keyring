package com.floreina.keyring.interceptors;

import io.grpc.*;

public class VersionInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    String clientVersion = metadata.get(VersionInterceptorKeys.METADATA_CLIENT_VERSION_KEY);
    if (clientVersion != null) {
      context = context.withValue(VersionInterceptorKeys.CONTEXT_CLIENT_VERSION_KEY, clientVersion);
    }
    return Contexts.interceptCall(context, call, metadata, next);
  }
}
