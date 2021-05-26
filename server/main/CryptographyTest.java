package server.main;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.security.SecureRandom;
import java.util.Optional;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
class CryptographyTest {
  @Mock private SecureRandom mockSecureRandom;

  private Cryptography cryptography;

  @BeforeEach
  void beforeEach() {
    cryptography = new Cryptography(mockSecureRandom, 2);
  }

  @Test
  void generateUacs_getsShortNumber_prependsWithZeroes() {
    when(mockSecureRandom.nextInt(100)).thenReturn(1);

    String code = cryptography.generateUacs();

    assertEquals("01", code);
  }

  @Test
  void generateUacs_getsLongNumber_returnsIntactString() {
    when(mockSecureRandom.nextInt(100)).thenReturn(99);

    String code = cryptography.generateUacs();

    assertEquals("99", code);
  }

  @Test
  void convertTotp_ignoresWhitespaces() {
    Optional<Integer> totp = cryptography.convertTotp(" 12 34 56 ");

    assertEquals(Optional.of(123456), totp);
  }

  @Test
  void convertTotp_ensuresOnlyDigits() {
    Optional<Integer> totp = cryptography.convertTotp("12ab56");

    assertEquals(Optional.empty(), totp);
  }

  @Test
  void convertTotp_ensuresSixSymbols() {
    Optional<Integer> totp = cryptography.convertTotp("1234567");

    assertEquals(Optional.empty(), totp);
  }
}
