package keyring.server.main.interceptors;

import io.grpc.Context;
import io.grpc.Metadata;

public class AgentAccessor {
  static final Metadata.Key<String> METADATA_IP_ADDRESS_KEY =
      Metadata.Key.of("x-ip-address", Metadata.ASCII_STRING_MARSHALLER);
  static final Metadata.Key<String> METADATA_USER_AGENT_KEY =
      Metadata.Key.of("x-user-agent", Metadata.ASCII_STRING_MARSHALLER);

  static final Context.Key<String> CONTEXT_IP_ADDRESS_KEY = Context.key("ip-address");
  static final Context.Key<String> CONTEXT_USER_AGENT_KEY = Context.key("user-agent");

  public String getIpAddress() {
    return CONTEXT_IP_ADDRESS_KEY.get();
  }

  public String getUserAgent() {
    return CONTEXT_USER_AGENT_KEY.get();
  }
}
