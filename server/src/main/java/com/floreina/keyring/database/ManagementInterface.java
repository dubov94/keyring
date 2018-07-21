package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.entities.Key;

import java.util.List;

public interface ManagementInterface {
  Key createKey(long userIdentifier, Password proto);

  List<Key> readKeys(long userIdentifier);

  void updateKey(long userIdentifier, IdentifiedKey proto);

  void deleteKey(long userIdentifier, long keyIdentifier);
}
