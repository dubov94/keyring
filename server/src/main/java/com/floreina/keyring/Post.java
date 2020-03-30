package com.floreina.keyring;

import com.floreina.keyring.templates.CodeBodyRendererFactory;
import com.floreina.keyring.templates.CodeHeadRendererFactory;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

import javax.inject.Inject;
import java.util.Optional;
import java.util.logging.Logger;

public class Post {
  private static final Logger logger = Logger.getLogger(Post.class.getName());
  private static final String DOMAIN = "pwd.floreina.me";
  private static final String FROM_NAME = "Key Ring";
  private static final String FROM_EMAIL = "keyring@pwd.floreina.me";
  private Optional<Configuration> maybeConfiguration;
  private CodeHeadRendererFactory codeHeadRendererFactory;
  private CodeBodyRendererFactory codeBodyRendererFactory;

  @Inject
  Post(
      Environment environment,
      CodeHeadRendererFactory codeHeadRendererFactory,
      CodeBodyRendererFactory codeBodyRendererFactory) {
    maybeConfiguration = environment.isProduction()
        ? Optional.of(
              new Configuration().domain(DOMAIN).apiKey(
                  environment.getMailgunApiKey()))
        : Optional.empty();
    this.codeHeadRendererFactory = codeHeadRendererFactory;
    this.codeBodyRendererFactory = codeBodyRendererFactory;
  }

  public void sendCode(String address, String code) {
    if (maybeConfiguration.isPresent()) {
      String head = codeHeadRendererFactory.newRenderer().setCode(code).render();
      String body = codeBodyRendererFactory.newRenderer().setCode(code).render();

      Mail.using(maybeConfiguration.get())
          .from(FROM_NAME, FROM_EMAIL)
          .to(address)
          .subject(head)
          .html(body)
          .build()
          .send();
    } else {
      logger.info(String.format("sendCode: %s", code));
    }
  }
}
