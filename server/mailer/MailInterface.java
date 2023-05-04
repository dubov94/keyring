package keyring.server.mailer;

interface MailInterface {
  void sendMailVc(String address, String code);
}
