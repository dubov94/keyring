package server.janitor;

import com.beust.jcommander.Parameter;

public class Environment {
  @Parameter(names = "--environment")
  private String type = "development";

  public boolean isProduction() {
    return "production".equals(type);
  }
}
