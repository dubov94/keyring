package com.floreina.keyring;

class Environment {
  String get(String key) {
    return System.getenv(key);
  }
}
