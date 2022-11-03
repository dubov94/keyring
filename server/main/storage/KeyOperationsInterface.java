package keyring.server.main.storage;

import io.vavr.Tuple2;
import java.util.List;
import keyring.server.main.entities.Key;
import keyring.server.main.proto.service.KeyAttrs;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;

public interface KeyOperationsInterface {
  Key createKey(long userIdentifier, Password content, KeyAttrs attrs);

  List<Key> readKeys(long userIdentifier);

  void updateKey(long userIdentifier, KeyPatch proto);

  void deleteKey(long userIdentifier, long keyIdentifier);

  Tuple2<Key, List<Key>> electShadow(long userId, long shadowId);
}
