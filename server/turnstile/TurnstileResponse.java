package io.paveldubov.turnstile;

import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableList;
import java.time.Instant;
import java.util.List;

@AutoValue
public abstract class TurnstileResponse {
  public abstract boolean success();

  public abstract Instant challengeTs();

  public abstract String hostname();

  public abstract ImmutableList<TurnstileError> errorCodes();

  public abstract String action();

  public abstract String cdata();

  public static Builder newBuilder() {
    return new AutoValue_TurnstileResponse.Builder()
        .setSuccess(false)
        .setChallengeTs(Instant.EPOCH)
        .setHostname("")
        .setErrorCodes(ImmutableList.of())
        .setAction("")
        .setCdata("");
  }

  @AutoValue.Builder
  public abstract static class Builder {
    public abstract Builder setSuccess(boolean success);

    public abstract Builder setChallengeTs(Instant challengeTs);

    public abstract Builder setHostname(String hostname);

    public abstract Builder setErrorCodes(List<TurnstileError> errorCodes);

    public abstract Builder setAction(String action);

    public abstract Builder setCdata(String cData);

    public abstract TurnstileResponse build();
  }
}
