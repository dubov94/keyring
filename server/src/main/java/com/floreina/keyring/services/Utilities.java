package com.floreina.keyring.services;

import com.floreina.keyring.Cryptography;
import com.floreina.keyring.entities.Key;
import com.floreina.keyring.entities.Tag;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.proto.service.IdentifiedKey;
import com.floreina.keyring.proto.service.Password;

import java.util.Objects;

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

  static boolean doesDigestMatchUser(Cryptography cryptography, User user, String digest) {
    return Objects.equals(user.getHash(), cryptography.computeHash(digest));
  }
}
