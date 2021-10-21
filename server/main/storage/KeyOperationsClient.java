package server.main.storage;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Optional;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
import server.main.entities.Key;
import server.main.entities.Key_;
import server.main.entities.User;
import server.main.proto.service.KeyAttrs;
import server.main.proto.service.KeyPatch;
import server.main.proto.service.Password;

public class KeyOperationsClient implements KeyOperationsInterface {
  @EntityController private EntityManager entityManager;

  @Override
  @LocalTransaction
  public Key createKey(long userIdentifier, Password content, KeyAttrs attrs) {
    long attrsParent = attrs.getParent();
    if (!attrs.getIsShadow() && attrsParent != 0) {
      throw new IllegalArgumentException();
    }
    Optional<User> maybeUser =
        Optional.ofNullable(
            entityManager.find(
                // To prevent `changeMasterKey` from getting stale sets.
                User.class, userIdentifier, LockModeType.OPTIMISTIC_FORCE_INCREMENT));
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key entity = new Key().mergeFromPassword(content).setUser(maybeUser.get());
    if (attrs.getIsShadow()) {
      entity.setIsShadow(true);
    }
    if (attrsParent != 0) {
      entity.setParent(
          // To prevent `promoteShadow` from getting stale shadows.
          entityManager.find(Key.class, attrsParent, LockModeType.OPTIMISTIC_FORCE_INCREMENT));
    }
    entityManager.persist(entity);
    return entity;
  }

  @Override
  @LocalTransaction
  public List<Key> readKeys(long userIdentifier) {
    return Queries.findManyToOne(entityManager, Key.class, Key_.user, userIdentifier);
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

  @Override
  @LocalTransaction
  public Tuple2<Key, List<Key>> promoteShadow(long userId, long shadowId) {
    Optional<Key> maybeShadow = Optional.ofNullable(entityManager.find(Key.class, shadowId));
    if (!maybeShadow.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key shadow = maybeShadow.get();
    if (shadow.getUser().getIdentifier() != userId) {
      throw new IllegalArgumentException();
    }
    Password password = shadow.toPassword();
    Optional<Key> maybeParent = Optional.ofNullable(shadow.getParent());
    if (!maybeParent.isPresent()) {
      Key newParent = createKey(userId, password, KeyAttrs.getDefaultInstance());
      entityManager.remove(shadow);
      return Tuple.of(newParent, ImmutableList.of(shadow));
    }
    Key parent = maybeParent.get();
    parent.mergeFromPassword(password);
    entityManager.persist(parent);
    List<Key> allShadows =
        Queries.findManyToOne(entityManager, Key.class, Key_.parent, parent.getIdentifier());
    allShadows.forEach((item) -> entityManager.remove(item));
    return Tuple.of(parent, allShadows);
  }
}
