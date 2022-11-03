package io.paveldubov.turnstile;

import com.google.auto.value.AutoValue;
import java.util.Optional;

@AutoValue
public abstract class TurnstileRequest {
  public abstract String response();

  public abstract Optional<String> remoteIp();

  public static Builder newBuilder() {
    return new AutoValue_TurnstileRequest.Builder().setResponse("").setRemoteIp("");
  }

  @AutoValue.Builder
  public abstract static class Builder {
    public abstract Builder setResponse(String response);

    public abstract Builder setRemoteIp(String remoteIp);

    public abstract TurnstileRequest build();
  }
}
