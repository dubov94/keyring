package keyring.server.janitor;

import com.beust.jcommander.Parameter;

public class Environment {
  @Parameter(names = "--environment")
  private String type = "development";

  private String getVariable(String key) {
    return System.getenv(key);
  }

  public boolean isProduction() {
    return "production".equals(type);
  }

  public String getPostgresPassword() {
    return getVariable("POSTGRES_PASSWORD");
  }
}
