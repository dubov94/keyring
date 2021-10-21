package server.main.storage;

import java.util.List;
import server.main.entities.Key;
import server.main.proto.service.KeyAttrs;
import server.main.proto.service.KeyPatch;
import server.main.proto.service.Password;

public interface KeyOperationsInterface {
  Key createKey(long userIdentifier, Password content, KeyAttrs attrs);

  List<Key> readKeys(long userIdentifier);

  void updateKey(long userIdentifier, KeyPatch proto);

  void deleteKey(long userIdentifier, long keyIdentifier);
}
