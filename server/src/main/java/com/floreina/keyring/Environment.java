package com.floreina.keyring;

public class Environment {
  public static String getVariable(String key) {
    return System.getenv(key);
  }

  public static boolean isProduction() {
    return "production".equals(getVariable("MODULE_ENVIRONMENT"));
  }
}
