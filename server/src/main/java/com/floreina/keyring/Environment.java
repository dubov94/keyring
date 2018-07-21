package com.floreina.keyring;

import java.io.IOException;
import java.util.Properties;

public class Environment {
  private static final String CONFIGURATION_PATH = "/configuration.properties";
  private Properties properties;

  Environment() {
    properties = new Properties();
  }

  void configureProperties() throws IOException {
    properties.load(getClass().getResourceAsStream(CONFIGURATION_PATH));
  }

  String get(String key) {
    return properties.getProperty(key);
  }
}
