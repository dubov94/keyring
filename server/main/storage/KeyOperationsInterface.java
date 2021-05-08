package server.main.storage;

import server.main.entities.Key;
import server.main.proto.service.IdentifiedKey;
import server.main.proto.service.Password;

import java.util.List;

public interface KeyOperationsInterface {
  Key createKey(long userIdentifier, Password proto);

  List<Key> readKeys(long userIdentifier);

  void updateKey(long userIdentifier, IdentifiedKey proto);

  void deleteKey(long userIdentifier, long keyIdentifier);
}
