package server.main;

import java.util.Optional;
import java.util.logging.Logger;
import javax.inject.Inject;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;
import server.main.templates.MailVerificationCodeBodyRendererFactory;
import server.main.templates.MailVerificationCodeHeadRendererFactory;

public class MailClient {
  private static final Logger logger = Logger.getLogger(MailClient.class.getName());
  private Environment environment;
  private Optional<Configuration> maybeConfiguration;
  private MailVerificationCodeHeadRendererFactory mailVerificationCodeHeadRendererFactory;
  private MailVerificationCodeBodyRendererFactory mailVerificationCodeBodyRendererFactory;

  @Inject
  MailClient(
      Environment environment,
      MailVerificationCodeHeadRendererFactory mailVerificationCodeHeadRendererFactory,
      MailVerificationCodeBodyRendererFactory mailVerificationCodeBodyRendererFactory) {
    this.environment = environment;
    maybeConfiguration =
        environment.isProduction()
            ? Optional.of(
                new Configuration()
                    .apiUrl(environment.getMailgunApiUrl())
                    .domain(environment.getMailgunDomain())
                    .apiKey(environment.getMailgunApiKey()))
            : Optional.empty();
    this.mailVerificationCodeHeadRendererFactory = mailVerificationCodeHeadRendererFactory;
    this.mailVerificationCodeBodyRendererFactory = mailVerificationCodeBodyRendererFactory;
  }

  public void sendMailVerificationCode(String address, String code) {
    if (!maybeConfiguration.isPresent()) {
      logger.info(String.format("sendMailVerificationCode: %s", code));
      return;
    }

    String head = mailVerificationCodeHeadRendererFactory.newRenderer().setCode(code).render();
    String body = mailVerificationCodeBodyRendererFactory.newRenderer().setCode(code).render();
    Mail.using(maybeConfiguration.get())
        .from(environment.getMailgunFrom())
        .to(address)
        .subject(head)
        .html(body)
        .build()
        .send();
  }
}
