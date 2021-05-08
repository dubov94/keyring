package server.main.storage;

import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
import server.main.entities.Key;
import server.main.entities.Key_;
import server.main.entities.User;
import server.main.entities.Utilities;
import server.main.proto.service.IdentifiedKey;
import server.main.proto.service.Password;

import javax.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

public class KeyOperationsClient implements KeyOperationsInterface {
  @EntityController private EntityManager entityManager;

  @Override
  @LocalTransaction
  public Key createKey(long userIdentifier, Password proto) {
    Key entity =
        Utilities.passwordToKey(proto)
            .setUser(entityManager.getReference(User.class, userIdentifier));
    entityManager.persist(entity);
    return entity;
  }

  @Override
  @LocalTransaction
  public List<Key> readKeys(long userIdentifier) {
    return Queries.findByUser(entityManager, Key.class, Key_.user, userIdentifier);
  }

  @Override
  @LocalTransaction
  public void updateKey(long userIdentifier, IdentifiedKey proto) {
    Optional<Key> maybeEntity =
        Optional.ofNullable(entityManager.find(Key.class, proto.getIdentifier()));
    if (maybeEntity.isPresent()) {
      Key entity = maybeEntity.get();
      if (entity.getUser().getIdentifier() == userIdentifier) {
        Utilities.updateKeyWithPassword(entity, proto.getPassword());
        entityManager.persist(entity);
        return;
      }
    }
    throw new IllegalArgumentException();
  }

  @Override
  @LocalTransaction
  public void deleteKey(long userIdentifier, long keyIdentifier) {
    Optional<Key> maybeEntity = Optional.ofNullable(entityManager.find(Key.class, keyIdentifier));
    if (maybeEntity.isPresent()) {
      Key entity = maybeEntity.get();
      if (entity.getUser().getIdentifier() == userIdentifier) {
        entityManager.remove(entity);
        return;
      }
    }
    throw new IllegalArgumentException();
  }
}
