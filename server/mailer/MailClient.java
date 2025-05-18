package keyring.server.mailer;

interface MailClient {
  void sendMailVc(String to, String username, String code);

  void sendUncompletedAuthn(String to, String username, String ipAddress);

  void sendDeactivationNotice(String to, String username, int inactivityPeriodYears, int daysLeft);
}
