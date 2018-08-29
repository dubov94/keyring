package com.floreina.keyring.services;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.entities.Key;
import com.floreina.keyring.entities.Tag;

import static java.util.stream.Collectors.toList;

class Utilities {
  static IdentifiedKey entityToIdentifiedKey(Key entity) {
    return IdentifiedKey.newBuilder()
        .setPassword(
            Password.newBuilder()
                .setValue(entity.getValue())
                .addAllTags(entity.getTags().stream().map(Tag::getValue).collect(toList()))
                .build())
        .setIdentifier(entity.getIdentifier())
        .build();
  }
}
