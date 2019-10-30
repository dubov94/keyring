package com.floreina.keyring;

public class Environment {
  private static String getVariable(String key) {
    return System.getenv(key);
  }

  public static boolean isProduction() {
    return "production".equals(getVariable("MODULE_ENVIRONMENT"));
  }

  static String getMailgunApiKey() {
    return getVariable("MAILGUN_API_KEY");
  }

  public static String getGeolocationServiceEndpoint() {
    return getVariable("GEOLOCATION_SERVICE_ENDPOINT");
  }
}
