package com.floreina.keyring.interceptors;

import com.floreina.keyring.sessions.SessionsClient;
import com.floreina.keyring.sessions.UserCast;
import io.grpc.*;

import javax.inject.Inject;
import java.util.Optional;

public class SessionInterceptor implements ServerInterceptor {
  private SessionsClient sessionsClient;

  @Inject
  SessionInterceptor(SessionsClient sessionsClient) {
    this.sessionsClient = sessionsClient;
  }

  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    String sessionIdentifier = metadata.get(SessionKeys.METADATA_SESSION_IDENTIFIER_KEY);
    if (sessionIdentifier != null) {
      Optional<UserCast> maybeUserCast =
          sessionsClient.readAndUpdateExpirationTime(sessionIdentifier);
      if (maybeUserCast.isPresent()) {
        context = context.withValue(SessionKeys.CONTEXT_SESSION_IDENTIFIER_KEY, sessionIdentifier);
        context = context.withValue(SessionKeys.CONTEXT_USER_CAST_KEY, maybeUserCast.get());
        return Contexts.interceptCall(context, call, metadata, next);
      }
    }
    call.close(Status.UNAUTHENTICATED, metadata);
    return new ServerCall.Listener<I>() {};
  }
}
