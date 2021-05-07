package com.floreina.keyring;

import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

import java.security.SecureRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

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
}
