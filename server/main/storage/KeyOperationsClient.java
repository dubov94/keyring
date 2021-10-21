package server.main.storage;

import java.util.List;
import java.util.Optional;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
import server.main.entities.Key;
import server.main.entities.Key_;
import server.main.entities.User;
import server.main.proto.service.KeyPatch;
import server.main.proto.service.Password;

public class KeyOperationsClient implements KeyOperationsInterface {
  @EntityController private EntityManager entityManager;

  @Override
  @LocalTransaction
  public Key createKey(long userIdentifier, Password proto) {
    // To prevent `changeMasterKey` from getting stale sets.
    Optional<User> maybeUser =
        Optional.ofNullable(
            entityManager.find(
                User.class, userIdentifier, LockModeType.OPTIMISTIC_FORCE_INCREMENT));
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key entity = new Key().mergeFromPassword(proto).setUser(maybeUser.get());
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
  public void updateKey(long userIdentifier, KeyPatch proto) {
    Optional<Key> maybeEntity =
        Optional.ofNullable(entityManager.find(Key.class, proto.getIdentifier()));
    if (!maybeEntity.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key entity = maybeEntity.get();
    if (entity.getUser().getIdentifier() != userIdentifier) {
      throw new IllegalArgumentException();
    }
    entity.mergeFromPassword(proto.getPassword());
    entityManager.persist(entity);
  }

  @Override
  @LocalTransaction
  public void deleteKey(long userIdentifier, long keyIdentifier) {
    Optional<Key> maybeEntity = Optional.ofNullable(entityManager.find(Key.class, keyIdentifier));
    if (!maybeEntity.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key entity = maybeEntity.get();
    if (entity.getUser().getIdentifier() != userIdentifier) {
      throw new IllegalArgumentException();
    }
    entityManager.remove(entity);
  }
}
