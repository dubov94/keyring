package keyring.server.main.entities;

import com.google.common.base.Preconditions;
import com.google.common.base.Utf8;

class Validators {
  static void checkStringSize(long upperLimitBytes, String sample) {
    Preconditions.checkArgument(Utf8.encodedLength(sample) <= upperLimitBytes);
  }

  static void checkMailLength(String sample) {
    // https://datatracker.ietf.org/doc/html/rfc3696#section-3
    Preconditions.checkArgument(sample.length() <= 320);
  }
}
