package keyring.server.mailer;

interface MailInterface {
  void sendMailVc(String to, String code);

  void sendUncompletedAuthn(String to, String ipAddress);
}
