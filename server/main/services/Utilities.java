package server.main.services;

import server.main.Cryptography;
import server.main.entities.Key;
import server.main.entities.Tag;
import server.main.entities.User;
import server.main.proto.service.IdentifiedKey;
import server.main.proto.service.Password;

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
