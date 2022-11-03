package keyring.server.main.interceptors;

import io.grpc.*;

public class VersionInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Context context = Context.current();
    String clientVersion = metadata.get(VersionAccessor.METADATA_CLIENT_VERSION_KEY);
    if (clientVersion != null) {
      context = context.withValue(VersionAccessor.CONTEXT_CLIENT_VERSION_KEY, clientVersion);
    }
    return Contexts.interceptCall(context, call, metadata, next);
  }
}
