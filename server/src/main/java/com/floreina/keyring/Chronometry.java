package com.floreina.keyring;

import java.time.Instant;
import java.time.temporal.TemporalUnit;

class Chronometry {
  Instant currentTime() {
    return Instant.now();
  }

  Instant subtract(Instant instant, int amountToSubtract, TemporalUnit temporalUnit) {
    return instant.minus(amountToSubtract, temporalUnit);
  }
}
