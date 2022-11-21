package keyring.server.main.interceptors;

import io.grpc.*;
import io.vavr.control.Either;
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

  private Either<Status, Context> _interceptCall(Metadata metadata) {
    String sessionToken = metadata.get(SessionAccessor.METADATA_SESSION_TOKEN_KEY);
    if (sessionToken == null) {
      return Either.left(Status.UNAUTHENTICATED);
    }
    Optional<UserPointer> userPointer = keyValueClient.touchSession(sessionToken);
    if (!userPointer.isPresent()) {
      return Either.left(Status.UNAUTHENTICATED);
    }
    Context context =
        Context.current()
            .withValue(SessionAccessor.CONTEXT_SESSION_TOKEN_KEY, sessionToken)
            .withValue(SessionAccessor.CONTEXT_USER_POINTER_KEY, userPointer.get());
    return Either.right(context);
  }

  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Either<Status, Context> result = _interceptCall(metadata);
    if (result.isRight()) {
      return Contexts.interceptCall(result.get(), call, metadata, next);
    } else {
      call.close(result.getLeft(), new Metadata());
      return new ServerCall.Listener<I>() {};
    }
  }
}
