package keyring.server.mailer;

interface MailService{
  void send(String to, String head, String body);
}
