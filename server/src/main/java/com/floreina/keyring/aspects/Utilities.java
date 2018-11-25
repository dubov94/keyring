package com.floreina.keyring.aspects;

import com.floreina.keyring.entities.User;

public class Utilities {
  public static boolean isUserActive(User user) {
    return user.getMail() != null;
  }
}
