package com.floreina.keyring.cache;

import com.floreina.keyring.entities.User;

public class UserCast {
  private long identifier;

  public static UserCast fromUser(User user) {
    return new UserCast().setIdentifier(user.getIdentifier());
  }

  public long getIdentifier() {
    return identifier;
  }

  public UserCast setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }
}
