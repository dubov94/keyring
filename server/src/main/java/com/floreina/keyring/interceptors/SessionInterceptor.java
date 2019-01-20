package com.floreina.keyring.interceptors;

import com.floreina.keyring.keyvalue.KeyValueClient;
import com.floreina.keyring.keyvalue.UserProjection;
import io.grpc.*;

import javax.inject.Inject;
import java.util.Optional;

public class SessionInterceptor implements ServerInterceptor {
  private KeyValueClient keyValueClient;

  @Inject
  SessionInterceptor(KeyValueClient keyValueClient) {
    this.keyValueClient = keyValueClient;
  }

  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    String sessionToken = metadata.get(SessionInterceptorKeys.METADATA_SESSION_TOKEN_KEY);
    if (sessionToken != null) {
      Optional<UserProjection> maybeUserProjection =
          keyValueClient.getSessionAndUpdateItsExpirationTime(sessionToken);
      if (maybeUserProjection.isPresent()) {
        context =
            context.withValue(
                SessionInterceptorKeys.CONTEXT_SESSION_TOKEN_KEY, sessionToken);
        context =
            context.withValue(
                SessionInterceptorKeys.CONTEXT_USER_PROJECTION_KEY, maybeUserProjection.get());
        return Contexts.interceptCall(context, call, metadata, next);
      }
    }
    call.close(Status.UNAUTHENTICATED, metadata);
    return new ServerCall.Listener<I>() {};
  }
}
