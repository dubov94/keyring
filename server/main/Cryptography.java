package keyring.server.main;

import com.google.common.base.Charsets;
import com.google.common.base.Joiner;
import com.google.common.collect.ImmutableList;
import com.google.common.hash.Hashing;
import com.google.common.io.BaseEncoding;
import com.google.common.math.IntMath;
import com.google.common.primitives.Bytes;
import com.google.crypto.tink.subtle.Hkdf;
import java.math.RoundingMode;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Optional;
import java.util.regex.Pattern;
import keyring.server.main.proto.constants.Argon2Config;
import org.apache.commons.codec.binary.StringUtils;

public class Cryptography {
  private int uacsLength;
  private SecureRandom secureRandom;
  private Arithmetic arithmetic;
  private Argon2Config argon2Config;
  private String pepperForFakeSalt;

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

  Cryptography(
      SecureRandom secureRandom,
      Arithmetic arithmetic,
      int uacsLength,
      Argon2Config argon2Config,
      String pepperForFakeSalt) {
    this.secureRandom = secureRandom;
    this.arithmetic = arithmetic;
    this.uacsLength = uacsLength;
    this.argon2Config = argon2Config;
    this.pepperForFakeSalt = pepperForFakeSalt;
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

  private static byte[] toBytes(String value) {
    return value.getBytes(Charsets.UTF_8);
  }

  public String generateA2p(String username) {
    byte[] saltBytes;
    try {
      byte[] info = Bytes.concat(toBytes("fake-salt"), new byte[] {0}, toBytes(username));
      // Use 16 bytes to match `crypto_pwhash_SALTBYTES`.
      saltBytes = Hkdf.computeHkdf("HMACSHA256", toBytes(pepperForFakeSalt), new byte[0], info, 16);
    } catch (GeneralSecurityException exception) {
      throw new IllegalStateException(exception);
    }
    String salt = BaseEncoding.base64Url().omitPadding().encode(saltBytes);
    String separator = argon2Config.getSeparator();
    int version = argon2Config.getVersion();
    String versionSegment = version != 0 ? String.format("%sv=%d", separator, version) : "";
    return String.format(
        "%s%s%s%sm=%d,t=%d,p=%d%s%s",
        separator,
        argon2Config.getType(),
        versionSegment,
        separator,
        argon2Config.getMemoryInBytes(),
        argon2Config.getIterations(),
        argon2Config.getThreads(),
        separator,
        salt);
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
    return MessageDigest.isEqual(
        StringUtils.getBytesUtf8(computeHash(digest)), StringUtils.getBytesUtf8(hash));
  }
}
