package server.main;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.TemporalUnit;

public class Chronometry {
  public Instant currentTime() {
    return Instant.now();
  }

  public Instant subtract(Instant instant, long amountToSubtract, TemporalUnit temporalUnit) {
    return instant.minus(amountToSubtract, temporalUnit);
  }

  public boolean isBefore(Instant left, Instant right) {
    return left.isBefore(right);
  }

  public Timestamp pastTimestamp(long amountToSubtract, TemporalUnit temporalUnit) {
    return Timestamp.from(subtract(currentTime(), amountToSubtract, temporalUnit));
  }
}
