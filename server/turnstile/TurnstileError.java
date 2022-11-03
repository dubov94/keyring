package io.paveldubov.turnstile;

import com.google.common.collect.ImmutableMap;

public enum TurnstileError {
  MISSING_INPUT_SECRET("missing-input-secret"),
  INVALID_INPUT_SECRET("invalid-input-secret"),
  MISSING_INPUT_RESPONSE("missing-input-response"),
  INVALID_INPUT_RESPONSE("invalid-input-response"),
  BAD_REQUEST("bad-request"),
  TIMEOUT_OR_DUPLICATE("timeout-or-duplicate"),
  INTERNAL_ERROR("internal-error");

  private static final ImmutableMap<String, TurnstileError> STRING_TO_ERROR;

  static {
    ImmutableMap.Builder<String, TurnstileError> builder = ImmutableMap.builder();
    for (TurnstileError error : TurnstileError.values()) {
      builder.put(error.toString(), error);
    }
    STRING_TO_ERROR = builder.build();
  }

  private final String error;

  private TurnstileError(String error) {
    this.error = error;
  }

  public static TurnstileError fromString(String error) {
    if (!STRING_TO_ERROR.containsKey(error)) {
      throw new IllegalArgumentException(String.format("Unknown `TurnstileError`: %s", error));
    }
    return STRING_TO_ERROR.get(error);
  }

  @Override
  public String toString() {
    return error;
  }
}
