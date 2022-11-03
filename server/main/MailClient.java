package server.main;

import java.util.Optional;
import java.util.logging.Logger;
import javax.inject.Inject;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;
import server.main.templates.MailVcBodyRendererFactory;
import server.main.templates.MailVcHeadRendererFactory;

public class MailClient {
  private static final Logger logger = Logger.getLogger(MailClient.class.getName());
  private Environment environment;
  private Optional<Configuration> maybeConfiguration;
  private MailVcHeadRendererFactory mailVcHeadRendererFactory;
  private MailVcBodyRendererFactory mailVcBodyRendererFactory;

  @Inject
  MailClient(
      Environment environment,
      MailVcHeadRendererFactory mailVcHeadRendererFactory,
      MailVcBodyRendererFactory mailVcBodyRendererFactory) {
    this.environment = environment;
    maybeConfiguration =
        environment.isProduction()
            ? Optional.of(
                new Configuration()
                    .apiUrl(environment.getMailgunApiUrl())
                    .domain(environment.getMailgunDomain())
                    .apiKey(environment.getMailgunApiKey()))
            : Optional.empty();
    this.mailVcHeadRendererFactory = mailVcHeadRendererFactory;
    this.mailVcBodyRendererFactory = mailVcBodyRendererFactory;
  }

  public void sendMailVc(String address, String code) {
    if (!maybeConfiguration.isPresent()) {
      logger.info(String.format("sendMailVc: %s", code));
      return;
    }

    String head = mailVcHeadRendererFactory.newRenderer().setCode(code).render();
    String body = mailVcBodyRendererFactory.newRenderer().setCode(code).render();
    Mail.using(maybeConfiguration.get())
        .from(environment.getEmailFromName(), environment.getEmailFromAddress())
        .to(address)
        .subject(head)
        .html(body)
        .build()
        .send();
  }
}
