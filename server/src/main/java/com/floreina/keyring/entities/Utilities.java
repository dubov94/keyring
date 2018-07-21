package com.floreina.keyring.entities;

import com.floreina.keyring.Password;

import static java.util.stream.Collectors.toList;

public class Utilities {
  public static Password keyToPassword(Key key) {
    return Password.newBuilder()
        .setValue(key.getValue())
        .addAllTags(key.getTags().stream().map(Tag::getValue).collect(toList()))
        .build();
  }

  public static Key passwordToKey(Password password) {
    return new Key()
        .setValue(password.getValue())
        .setTags(
            password
                .getTagsList()
                .stream()
                .map(label -> new Tag().setValue(label))
                .collect(toList()));
  }
}
