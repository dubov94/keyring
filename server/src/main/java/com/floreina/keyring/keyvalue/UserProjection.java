package com.floreina.keyring.keyvalue;

import com.floreina.keyring.entities.User;

public class UserProjection {
  private long identifier;

  public static UserProjection fromUser(User user) {
    return new UserProjection().setIdentifier(user.getIdentifier());
  }

  public long getIdentifier() {
    return identifier;
  }

  public UserProjection setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }
}
