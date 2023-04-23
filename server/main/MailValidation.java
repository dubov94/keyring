package keyring.server.main;

import org.apache.commons.validator.routines.EmailValidator;

public class MailValidation {
  private EmailValidator emailValidator;

  MailValidation(EmailValidator emailValidator) {
    this.emailValidator = emailValidator;
  }

  public boolean checkAddress(String address) {
    return emailValidator.isValid(address);
  }
}
