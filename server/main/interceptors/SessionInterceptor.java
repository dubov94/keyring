package keyring.server.main.interceptors;

import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.Status;
import io.vavr.control.Either;
import java.util.Optional;
import javax.inject.Inject;
import keyring.server.main.keyvalue.KeyValueClient;
import keyring.server.main.keyvalue.values.KvSession;

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
    Optional<KvSession> kvSession = keyValueClient.getExSession(sessionToken);
    if (!kvSession.isPresent()) {
      return Either.left(Status.UNAUTHENTICATED);
    }
    Context context =
        Context.current()
            .withValue(SessionAccessor.CONTEXT_SESSION_TOKEN_KEY, sessionToken)
            .withValue(SessionAccessor.CONTEXT_KV_SESSION_KEY, kvSession.get());
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
