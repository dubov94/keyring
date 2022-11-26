package keyring.server.main;

import com.google.common.base.Charsets;
import com.google.common.base.Joiner;
import com.google.common.collect.ImmutableList;
import com.google.common.hash.Hashing;
import com.google.common.io.BaseEncoding;
import com.google.common.math.IntMath;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

public class Cryptography {
  private int uacsLength;
  private SecureRandom secureRandom;
  private Arithmetic arithmetic;

  private static final Pattern TOTP_PATTERN = Pattern.compile("^\\d{6}$");
  // https://github.com/dubov94/keyring/blob/master/pwa/src/cryptography/argon2.ts
  private static final ImmutableList<String> A2P_PATTERN_PARTS =
      ImmutableList.of(
          "^",
          "\\$(?<type>argon2(?:i|d|id))",
          "(?:\\$v=(?<version>[1-9][0-9]*))?",
          "\\$m=(?<memoryInBytes>[1-9][0-9]*),t=(?<iterations>[1-9][0-9]*),p=(?<threads>[1-9][0-9]*)",
          "\\$(?<salt>[A-Za-z0-9-_=]+)",
          "$");
  private static final Pattern A2P_PATTERN = Pattern.compile(Joiner.on("").join(A2P_PATTERN_PARTS));
  // https://github.com/dubov94/keyring/blob/46bc69e7249724bfaaebcd1a3a990fcb14ef2ea4/pwa/src/cryptography/sodium_client.ts#L8
  private static final int DIGEST_BASE64_LENGTH = IntMath.divide(32 * 8, 6, RoundingMode.CEILING);
  // https://github.com/dubov94/keyring/blob/46bc69e7249724bfaaebcd1a3a990fcb14ef2ea4/pwa/src/cryptography/sodium.worker.ts#L8
  private static final Pattern DIGEST_PATTERN =
      Pattern.compile(String.format("^[A-Za-z0-9-_]{%d}$", DIGEST_BASE64_LENGTH));

  Cryptography(SecureRandom secureRandom, Arithmetic arithmetic, int uacsLength) {
    this.secureRandom = secureRandom;
    this.arithmetic = arithmetic;
    this.uacsLength = uacsLength;
  }

  public String generateUacs() {
    StringBuilder stringBuilder = new StringBuilder();
    int randomNumber = secureRandom.nextInt(arithmetic.pow(10, uacsLength));
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
    return BaseEncoding.base64().omitPadding().encode(randomBytes);
  }

  public boolean validateA2p(String a2p) {
    return A2P_PATTERN.matcher(a2p).matches();
  }

  public boolean validateDigest(String digest) {
    return DIGEST_PATTERN.matcher(digest).matches();
  }

  public String computeHash(String value) {
    return Hashing.sha256().hashString(value, Charsets.UTF_8).toString();
  }

  public Optional<Integer> convertTotp(String raw) {
    String normalized = raw.replaceAll("\\s", "");
    if (TOTP_PATTERN.matcher(normalized).matches()) {
      return Optional.of(Integer.valueOf(normalized));
    }
    return Optional.empty();
  }

  public boolean doesDigestMatchHash(String digest, String hash) {
    return Objects.equals(computeHash(digest), hash);
  }
}
