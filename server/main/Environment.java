package keyring.server.main;

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

  private String mrgnVersion = "";

  public Environment(String mrgnVersion) {
    this.mrgnVersion = mrgnVersion;
  }

  private String getVariable(String key) {
    return System.getenv(key);
  }

  public int getPort() {
    return port;
  }

  public boolean isProduction() {
    return "production".equals(type);
  }

  public String getRedisHost() {
    return redisHost;
  }

  public String getGeolocationAddress() {
    return geolocationAddress;
  }

  public String getPostgresJdbcUri() {
    return getVariable("POSTGRES_JDBC_URI");
  }

  public String getPostgresUsername() {
    return getVariable("POSTGRES_USERNAME");
  }

  public String getPostgresPassword() {
    return getVariable("POSTGRES_PASSWORD");
  }

  public String getRedisPassword() {
    return getVariable("REDIS_PASSWORD");
  }

  public String getTurnstileSecretKey() {
    return getVariable("TURNSTILE_SECRET_KEY");
  }

  public String getMrgnVersion() {
    return mrgnVersion;
  }
}
