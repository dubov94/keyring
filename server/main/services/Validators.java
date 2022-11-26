package keyring.server.main.services;

import java.util.regex.Pattern;

class Validators {
  // if_change(username_pattern)
  private static final Pattern USERNAME_PATTERN = Pattern.compile("^\\w{3,64}$");
  // then_change(pwa/src/components/form_validators.ts:username_pattern)

  static boolean checkUsername(String username) {
    return USERNAME_PATTERN.matcher(username).matches();
  }
}
