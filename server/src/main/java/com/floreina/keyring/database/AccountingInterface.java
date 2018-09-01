package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.entities.Activation;
import com.floreina.keyring.entities.User;

import java.util.List;
import java.util.Optional;

public interface AccountingInterface {
  User createUserWithActivation(
      String username, String salt, String digest, String mail, String code);

  Optional<Activation> getActivationByUser(long identifier);

  Optional<User> activateUser(long identifier);

  Optional<User> getUserByName(String username);

  Optional<User> getUserByIdentifier(long identifier);

  Optional<User> changeMasterKey(
      long userIdentifier, String salt, String digest, List<IdentifiedKey> protos);
}
