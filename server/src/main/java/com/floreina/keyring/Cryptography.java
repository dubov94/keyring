package com.floreina.keyring;

import com.google.common.base.Charsets;
import com.google.common.hash.Hashing;
import com.google.common.io.BaseEncoding;
import java.security.SecureRandom;

public class Cryptography {
  private int uacsLength;
  private SecureRandom secureRandom;

  Cryptography(SecureRandom secureRandom, int uacsLength) {
    this.secureRandom = secureRandom;
    this.uacsLength = uacsLength;
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

  public String generateUacs() {
    StringBuilder stringBuilder = new StringBuilder();
    int randomNumber = secureRandom.nextInt(pow(10, uacsLength));
    String codeSuffix = String.valueOf(randomNumber);
    int skipsCount = uacsLength - codeSuffix.length();
    for (int padding = 0; padding < skipsCount; ++padding) {
      stringBuilder.append('0');
    }
    stringBuilder.append(codeSuffix);
    return stringBuilder.toString();
  }

  public String generateTts() {
    // https://owasp.org/www-community/vulnerabilities/Insufficient_Session-ID_Length
    byte[] randomBytes = new byte[128 / 8];
    secureRandom.nextBytes(randomBytes);
    return BaseEncoding.base64().encode(randomBytes);
  }

  public String computeHash(String value) {
    return Hashing.sha256().hashString(value, Charsets.UTF_8).toString();
  }
}
