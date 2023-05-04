package keyring.server.mailer;

import keyring.server.mailer.templates.MailVcBodyRendererFactory;
import keyring.server.mailer.templates.MailVcHeadRendererFactory;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

class MailClient implements MailInterface {
  private MailVcHeadRendererFactory mailVcHeadRendererFactory;
  private MailVcBodyRendererFactory mailVcBodyRendererFactory;
  private Configuration configuration;
  private String fromName;
  private String fromAddress;

  MailClient(
      Environment environment,
      MailVcHeadRendererFactory mailVcHeadRendererFactory,
      MailVcBodyRendererFactory mailVcBodyRendererFactory) {
    this.mailVcHeadRendererFactory = mailVcHeadRendererFactory;
    this.mailVcBodyRendererFactory = mailVcBodyRendererFactory;
    this.configuration =
        new Configuration()
            .apiUrl(environment.getMailgunApiUrl())
            .domain(environment.getMailgunDomain())
            .apiKey(environment.getMailgunApiKey());
    this.fromName = environment.getEmailFromName();
    this.fromAddress = environment.getEmailFromAddress();
  }

  public void sendMailVc(String address, String code) {
    String head = mailVcHeadRendererFactory.newRenderer().setCode(code).render();
    String body = mailVcBodyRendererFactory.newRenderer().setCode(code).render();
    Mail.using(configuration)
        .from(fromName, fromAddress)
        .to(address)
        .subject(head)
        .html(body)
        .build()
        .send();
  }
}
