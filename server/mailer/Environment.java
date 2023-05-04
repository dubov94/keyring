package keyring.server.mailer;

import com.beust.jcommander.Parameter;

class Environment {
  @Parameter(names = "--environment")
  private String type = "development";

  @Parameter(names = "--redis_host")
  private String redisHost = "localhost";

  @Parameter(names = "--mailgun_api_url")
  private String mailgunApiUrl = "";

  @Parameter(names = "--mailgun_domain")
  private String mailgunDomain = "";

  @Parameter(names = "--email_from_name")
  private String emailFromName = "";

  @Parameter(names = "--email_from_address")
  private String emailFromAddress = "";

  private String getVariable(String key) {
    return System.getenv(key);
  }

  public boolean isProduction() {
    return "production".equals(type);
  }

  public String getMailgunApiUrl() {
    return mailgunApiUrl;
  }

  public String getMailgunDomain() {
    return mailgunDomain;
  }

  public String getEmailFromName() {
    return emailFromName;
  }

  public String getEmailFromAddress() {
    return emailFromAddress;
  }

  public String getMailgunApiKey() {
    return getVariable("MAILGUN_API_KEY");
  }

  public String getRedisHost() {
    return redisHost;
  }

  public String getRedisPassword() {
    return getVariable("REDIS_PASSWORD");
  }

  public String getConsumerName() {
    if (isProduction()) {
      return getVariable("K8S_POD_NAME");
    }
    return "default";
  }
}
