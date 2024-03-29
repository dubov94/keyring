package keyring.server.mailer;

import keyring.server.mailer.templates.MailVcBodyRendererFactory;
import keyring.server.mailer.templates.MailVcHeadRendererFactory;
import keyring.server.mailer.templates.UncompletedAuthnBodyRendererFactory;
import keyring.server.mailer.templates.UncompletedAuthnHeadRendererFactory;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

class MailClient implements MailInterface {
  private MailVcHeadRendererFactory mailVcHeadRendererFactory;
  private MailVcBodyRendererFactory mailVcBodyRendererFactory;
  private UncompletedAuthnHeadRendererFactory uncompletedAuthnHeadRendererFactory;
  private UncompletedAuthnBodyRendererFactory uncompletedAuthnBodyRendererFactory;
  private Configuration configuration;
  private String fromName;
  private String fromAddress;

  MailClient(
      Environment environment,
      MailVcHeadRendererFactory mailVcHeadRendererFactory,
      MailVcBodyRendererFactory mailVcBodyRendererFactory,
      UncompletedAuthnHeadRendererFactory uncompletedAuthnHeadRendererFactory,
      UncompletedAuthnBodyRendererFactory uncompletedAuthnBodyRendererFactory) {
    this.mailVcHeadRendererFactory = mailVcHeadRendererFactory;
    this.mailVcBodyRendererFactory = mailVcBodyRendererFactory;
    this.uncompletedAuthnHeadRendererFactory = uncompletedAuthnHeadRendererFactory;
    this.uncompletedAuthnBodyRendererFactory = uncompletedAuthnBodyRendererFactory;
    this.configuration =
        new Configuration()
            .apiUrl(environment.getMailgunApiUrl())
            .domain(environment.getMailgunDomain())
            .apiKey(environment.getMailgunApiKey());
    this.fromName = environment.getEmailFromName();
    this.fromAddress = environment.getEmailFromAddress();
  }

  @Override
  public void sendMailVc(String to, String code) {
    String head = mailVcHeadRendererFactory.newRenderer().setCode(code).render();
    String body = mailVcBodyRendererFactory.newRenderer().setCode(code).render();
    Mail.using(configuration)
        .from(fromName, fromAddress)
        .to(to)
        .subject(head)
        .html(body)
        .build()
        .send();
  }

  @Override
  public void sendUncompletedAuthn(String to, String ipAddress) {
    String head = uncompletedAuthnHeadRendererFactory.newRenderer().render();
    String body =
        uncompletedAuthnBodyRendererFactory.newRenderer().setIpAddress(ipAddress).render();
    Mail.using(configuration)
        .from(fromName, fromAddress)
        .to(to)
        .subject(head)
        .html(body)
        .build()
        .send();
  }
}
