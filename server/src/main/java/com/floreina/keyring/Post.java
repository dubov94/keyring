package com.floreina.keyring;

import com.floreina.keyring.templates.CodeBodyRendererFactory;
import com.floreina.keyring.templates.CodeHeadRendererFactory;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

import javax.inject.Inject;

public class Post {
  private Configuration configuration;
  private CodeHeadRendererFactory codeHeadRendererFactory;
  private CodeBodyRendererFactory codeBodyRendererFactory;

  @Inject
  Post() {
    configuration =
        new Configuration()
            .domain("pwd.floreina.me")
            .apiKey(Environment.getVariable("MAILGUN_API_KEY"));
  }

  public void sendCode(String address, String code) {
    String head = codeHeadRendererFactory.newRenderer().setCode(code).render();
    String body = codeBodyRendererFactory.newRenderer().setCode(code).render();
    Mail.using(configuration)
        .from("Key Ring", "keyring@pwd.floreina.me")
        .to(address)
        .subject(head)
        .html(body)
        .build()
        .send();
  }
}
