package keyring.server.main;

import org.apache.commons.validator.routines.EmailValidator;

public class MailNormaliser {
  private EmailValidator emailValidator;

  MailNormaliser(EmailValidator emailValidator) {
    this.emailValidator = emailValidator;
  }

  public boolean checkAddress(String address) {
    return emailValidator.isValid(address);
  }
}
