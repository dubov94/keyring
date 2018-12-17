package com.floreina.keyring.interceptors;

import com.floreina.keyring.keyvalue.KeyValueClient;
import com.floreina.keyring.keyvalue.UserCast;
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
    String sessionIdentifier = metadata.get(SessionInterceptorKeys.METADATA_SESSION_IDENTIFIER_KEY);
    if (sessionIdentifier != null) {
      Optional<UserCast> maybeUserCast =
          keyValueClient.getSessionAndUpdateItsExpirationTime(sessionIdentifier);
      if (maybeUserCast.isPresent()) {
        context =
            context.withValue(
                SessionInterceptorKeys.CONTEXT_SESSION_IDENTIFIER_KEY, sessionIdentifier);
        context =
            context.withValue(SessionInterceptorKeys.CONTEXT_USER_CAST_KEY, maybeUserCast.get());
        return Contexts.interceptCall(context, call, metadata, next);
      }
    }
    call.close(Status.UNAUTHENTICATED, metadata);
    return new ServerCall.Listener<I>() {};
  }
}
