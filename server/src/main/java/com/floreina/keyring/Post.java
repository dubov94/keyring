package com.floreina.keyring;

import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;

import javax.inject.Inject;

public class Post {
  private Configuration configuration;

  @Inject
  Post(Environment environment) {
    configuration =
        new Configuration()
            .domain("pwd.floreina.me")
            .apiKey(environment.get("MAILGUN_API_KEY"))
            .from("keyring@pwd.floreina.me");
  }

  public void send(String address, String head, String body) {
    Mail.using(configuration).to(address).subject(head).html(body).build().send();
  }
}
