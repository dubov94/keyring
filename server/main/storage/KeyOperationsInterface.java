package keyring.server.main.storage;

import io.vavr.Tuple2;
import java.util.List;
import java.util.UUID;
import keyring.server.main.entities.Key;
import keyring.server.main.proto.service.KeyAttrs;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;

public interface KeyOperationsInterface {
  List<Key> importKeys(long sessionId, List<Password> passwords);

  Key createKey(long sessionId, Password content, KeyAttrs attrs);

  List<Key> readKeys(long sessionId);

  void updateKey(long sessionId, KeyPatch proto);

  void deleteKey(long sessionId, UUID keyUid);

  Tuple2<Key, List<Key>> electShadow(long sessionId, UUID shadowUid);

  void togglePin(long sessionId, UUID keyUid, boolean isPinned);
}
