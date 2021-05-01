package com.floreina.keyring.keyvalue;

import com.floreina.keyring.entities.User;

import java.time.Instant;

public class UserPointer {
  private long identifier;
  private long creationTimeInMs;

  public static UserPointer fromUser(User user) {
    return new UserPointer().setIdentifier(user.getIdentifier());
  }

  public long getIdentifier() {
    return identifier;
  }

  public UserPointer setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public Instant getCreationTime() {
    return Instant.ofEpochMilli(creationTimeInMs);
  }

  public UserPointer setCreationTimeInMs(Instant creationTimeInMs) {
    this.creationTimeInMs = creationTimeInMs.toEpochMilli();
    return this;
  }
}
