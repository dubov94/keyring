package server.main;

import com.beust.jcommander.Parameter;

public class Environment {
  @Parameter(names = "--port")
  private int port = 5001;

  @Parameter(names = "--environment")
  private String type = "development";

  @Parameter(names = "--redis_host")
  private String redisHost = "localhost";

  @Parameter(names = "--geolocation_address")
  private String geolocationAddress = "localhost:5003";

  private String getVariable(String key) {
    return System.getenv(key);
  }

  public int getPort() {
    return port;
  }

  public boolean isProduction() {
    return "production".equals(type);
  }

  public String getMailgunApiKey() {
    return getVariable("MAILGUN_API_KEY");
  }

  public String getRedisHost() {
    return redisHost;
  }

  public String getGeolocationAddress() {
    return geolocationAddress;
  }

  public String getPostgresPassword() {
    return getVariable("POSTGRES_PASSWORD");
  }

  public String getRedisPassword() {
    return getVariable("REDIS_PASSWORD");
  }
}
