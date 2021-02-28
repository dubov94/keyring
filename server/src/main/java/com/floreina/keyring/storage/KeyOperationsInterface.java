package com.floreina.keyring.storage;

import com.floreina.keyring.entities.Key;
import com.floreina.keyring.proto.service.IdentifiedKey;
import com.floreina.keyring.proto.service.Password;

import java.util.List;

public interface KeyOperationsInterface {
  Key createKey(long userIdentifier, Password proto);

  List<Key> readKeys(long userIdentifier);

  void updateKey(long userIdentifier, IdentifiedKey proto);

  void deleteKey(long userIdentifier, long keyIdentifier);
}
