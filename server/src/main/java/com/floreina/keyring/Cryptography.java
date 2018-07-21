package com.floreina.keyring;

import java.security.SecureRandom;
import java.util.UUID;

public class Cryptography {
  private int securityCodeLength;
  private SecureRandom secureRandom;

  Cryptography(SecureRandom secureRandom, int securityCodeLength) {
    this.secureRandom = secureRandom;
    this.securityCodeLength = securityCodeLength;
  }

  private int pow(int base, int power) {
    if (power == 0) {
      return 1;
    } else if (power % 2 == 0) {
      int multiplier = pow(base, power / 2);
      return multiplier * multiplier;
    } else {
      return base * pow(base, power - 1);
    }
  }

  public String generateSecurityCode() {
    StringBuilder stringBuilder = new StringBuilder();
    int randomNumber = secureRandom.nextInt(pow(10, securityCodeLength));
    String codeSuffix = String.valueOf(randomNumber);
    int skipsCount = securityCodeLength - codeSuffix.length();
    for (int padding = 0; padding < skipsCount; ++padding) {
      stringBuilder.append('0');
    }
    stringBuilder.append(codeSuffix);
    return stringBuilder.toString();
  }

  public String generateSessionKey() {
    return UUID.randomUUID().toString();
  }
}
