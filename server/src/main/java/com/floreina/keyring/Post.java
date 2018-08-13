package com.floreina.keyring;

import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

import javax.inject.Inject;

public class Post {
  private Configuration configuration;

  @Inject
  Post() {
    configuration =
        new Configuration()
            .domain("pwd.floreina.me")
            .apiKey(Environment.getVariable("MAILGUN_API_KEY"));
  }

  public void send(String address, String head, String body) {
    Mail.using(configuration)
        .from("Key Ring", "keyring@pwd.floreina.me")
        .to(address)
        .subject(head)
        .html(body)
        .build()
        .send();
  }
}
