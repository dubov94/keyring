package com.floreina.keyring.keyvalue;

import com.floreina.keyring.entities.User;

import java.time.Instant;

public class UserProjection {
  private long identifier;
  private long creationTimeInMs;

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

  public Instant getCreationTime() {
    return Instant.ofEpochMilli(creationTimeInMs);
  }

  public UserProjection setCreationTimeInMs(Instant creationTimeInMs) {
    this.creationTimeInMs = creationTimeInMs.toEpochMilli();
    return this;
  }
}
