package keyring.server.main.interceptors;

import io.grpc.*;
import java.util.Optional;
import javax.inject.Inject;
import keyring.server.main.keyvalue.KeyValueClient;
import keyring.server.main.keyvalue.UserPointer;

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
    String sessionToken = metadata.get(SessionAccessor.METADATA_SESSION_TOKEN_KEY);
    if (sessionToken != null) {
      Optional<UserPointer> maybeUserPointer = keyValueClient.touchSession(sessionToken);
      if (maybeUserPointer.isPresent()) {
        return Contexts.interceptCall(
            Context.current()
                .withValue(SessionAccessor.CONTEXT_SESSION_TOKEN_KEY, sessionToken)
                .withValue(SessionAccessor.CONTEXT_USER_POINTER_KEY, maybeUserPointer.get()),
            call,
            metadata,
            next);
      }
    }
    call.close(Status.UNAUTHENTICATED, new Metadata());
    return new ServerCall.Listener<I>() {};
  }
}
