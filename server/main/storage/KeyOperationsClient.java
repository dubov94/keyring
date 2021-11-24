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
import server.main.aspects.Annotations.LockEntity;
import server.main.entities.Key;
import server.main.entities.Key_;
import server.main.entities.User;
import server.main.proto.service.KeyAttrs;
import server.main.proto.service.KeyPatch;
import server.main.proto.service.Password;

public class KeyOperationsClient implements KeyOperationsInterface {
  @EntityController private EntityManager entityManager;

  @LockEntity(name = "user")
  private Key _spawnKey(User user, Password content, KeyAttrs attrs) {
    Key newKey = new Key().mergeFromPassword(content).setUser(user);
    if (attrs.getIsShadow()) {
      newKey.setIsShadow(true);
    }
    long attrsParent = attrs.getParent();
    if (attrsParent != 0) {
      Key parent =
          entityManager.find(Key.class, attrsParent, LockModeType.OPTIMISTIC_FORCE_INCREMENT);
      if (parent == null) {
        throw new IllegalArgumentException(
            String.format("Referenced parent %d does not exist", attrsParent));
      }
      if (parent.getUser().getIdentifier() != user.getIdentifier()) {
        throw new IllegalArgumentException(
            String.format("Parent %d does not belong to the user", attrsParent));
      }
      newKey.setParent(parent);
    }
    entityManager.persist(newKey);
    return newKey;
  }

  @Override
  @LocalTransaction
  public Key createKey(long userIdentifier, Password content, KeyAttrs attrs) {
    if (!attrs.getIsShadow() && attrs.getParent() != 0) {
      throw new IllegalArgumentException();
    }
    Optional<User> maybeUser = Optional.ofNullable(entityManager.find(User.class, userIdentifier));
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    return _spawnKey(maybeUser.get(), content, attrs);
  }

  @Override
  @LocalTransaction
  public List<Key> readKeys(long userIdentifier) {
    return Queries.findManyToOne(entityManager, Key.class, Key_.user, userIdentifier);
  }

  @LockEntity(name = "key")
  private void _updateKey(Key key, KeyPatch patch) {
    key.mergeFromPassword(patch.getPassword());
    entityManager.persist(key);
  }

  @Override
  @LocalTransaction
  public void updateKey(long userIdentifier, KeyPatch patch) {
    Optional<Key> maybeKey =
        Optional.ofNullable(entityManager.find(Key.class, patch.getIdentifier()));
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key key = maybeKey.get();
    if (key.getUser().getIdentifier() != userIdentifier) {
      throw new IllegalArgumentException();
    }
    _updateKey(key, patch);
  }

  @LockEntity(name = "key")
  private void _deleteKey(Key key) {
    entityManager.remove(key);
  }

  @Override
  @LocalTransaction
  public void deleteKey(long userIdentifier, long keyIdentifier) {
    Optional<Key> maybeKey = Optional.ofNullable(entityManager.find(Key.class, keyIdentifier));
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key key = maybeKey.get();
    if (key.getUser().getIdentifier() != userIdentifier) {
      throw new IllegalArgumentException();
    }
    _deleteKey(key);
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
