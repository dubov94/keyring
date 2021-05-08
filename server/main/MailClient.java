package server.main;

import server.main.templates.MailVerificationCodeBodyRendererFactory;
import server.main.templates.MailVerificationCodeHeadRendererFactory;
import java.util.Optional;
import java.util.logging.Logger;
import javax.inject.Inject;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

public class MailClient {
  private static final Logger logger = Logger.getLogger(MailClient.class.getName());
  private static final String DOMAIN = "pwd.floreina.me";
  private static final String FROM_NAME = "Key Ring";
  private static final String FROM_EMAIL = "keyring@pwd.floreina.me";
  private Optional<Configuration> maybeConfiguration;
  private MailVerificationCodeHeadRendererFactory mailVerificationCodeHeadRendererFactory;
  private MailVerificationCodeBodyRendererFactory mailVerificationCodeBodyRendererFactory;

  @Inject
  MailClient(
      Environment environment,
      MailVerificationCodeHeadRendererFactory mailVerificationCodeHeadRendererFactory,
      MailVerificationCodeBodyRendererFactory mailVerificationCodeBodyRendererFactory) {
    maybeConfiguration =
        environment.isProduction()
            ? Optional.of(new Configuration().domain(DOMAIN).apiKey(environment.getMailgunApiKey()))
            : Optional.empty();
    this.mailVerificationCodeHeadRendererFactory = mailVerificationCodeHeadRendererFactory;
    this.mailVerificationCodeBodyRendererFactory = mailVerificationCodeBodyRendererFactory;
  }

  public void sendMailVerificationCode(String address, String code) {
    if (maybeConfiguration.isPresent()) {
      String head = mailVerificationCodeHeadRendererFactory.newRenderer().setCode(code).render();
      String body = mailVerificationCodeBodyRendererFactory.newRenderer().setCode(code).render();

      Mail.using(maybeConfiguration.get())
          .from(FROM_NAME, FROM_EMAIL)
          .to(address)
          .subject(head)
          .html(body)
          .build()
          .send();
    } else {
      logger.info(String.format("sendMailVerificationCode: %s", code));
    }
  }
}
