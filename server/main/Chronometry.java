package keyring.server.main;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.TemporalUnit;
import java.util.function.Supplier;

public class Chronometry {
  private Arithmetic arithmetic;
  private Supplier<Instant> nowSupplier;

  public Chronometry(Arithmetic arithmetic, Supplier<Instant> nowSupplier) {
    this.arithmetic = arithmetic;
    this.nowSupplier = nowSupplier;
  }

  public Instant currentTime() {
    return nowSupplier.get();
  }

  public Timestamp pastTimestamp(long amountToSubtract, TemporalUnit temporalUnit) {
    return Timestamp.from(currentTime().minus(amountToSubtract, temporalUnit));
  }

  public Instant nextAttempt(
      Instant lastAttempt, int attemptCount, int baseDelayS, int graceCount) {
    int attemptDelta = attemptCount - graceCount;
    if (attemptDelta < 0) {
      return Instant.EPOCH;
    }
    return lastAttempt.plusSeconds(baseDelayS * arithmetic.pow(2, attemptDelta));
  }
}
