package keyring.server.main.interceptors;

import io.grpc.*;

public class AgentInterceptor implements ServerInterceptor {
  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    return Contexts.interceptCall(
        Context.current()
            .withValue(
                AgentAccessor.CONTEXT_IP_ADDRESS_KEY,
                metadata.get(AgentAccessor.METADATA_IP_ADDRESS_KEY))
            .withValue(
                AgentAccessor.CONTEXT_USER_AGENT_KEY,
                metadata.get(AgentAccessor.METADATA_USER_AGENT_KEY)),
        call,
        metadata,
        next);
  }
}
