package keyring.server.janitor;

import com.beust.jcommander.Parameter;

public class Environment {
  @Parameter(names = "--environment")
  private String type = "development";

  @Parameter(names = "--redis_host")
  private String redisHost = "localhost";

  private String getVariable(String key) {
    return System.getenv(key);
  }

  public boolean isProduction() {
    return "production".equals(type);
  }

  public String getPostgresPassword() {
    return getVariable("POSTGRES_PASSWORD");
  }

  public String getRedisHost() {
    return redisHost;
  }

  public String getRedisPassword() {
    return getVariable("REDIS_PASSWORD");
  }
}
