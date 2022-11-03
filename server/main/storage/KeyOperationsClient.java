package keyring.server.main.storage;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.LockEntity;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.Key_;
import keyring.server.main.entities.User;
import keyring.server.main.proto.service.KeyAttrs;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;

public class KeyOperationsClient implements KeyOperationsInterface {
  @ContextualEntityManager private EntityManager entityManager;

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
      if (!Objects.equals(parent.getUser().getIdentifier(), user.getIdentifier())) {
        throw new IllegalArgumentException(
            String.format("Parent %d does not belong to the user", attrsParent));
      }
      if (parent.getIsShadow()) {
        throw new IllegalArgumentException(
            String.format("Cannot create a shadow for %d as it's also a shadow", attrsParent));
      }
      newKey.setParent(parent);
    }
    entityManager.persist(newKey);
    return newKey;
  }

  @Override
  @WithEntityTransaction
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
  @WithEntityTransaction
  public List<Key> readKeys(long userIdentifier) {
    return Queries.findManyToOne(entityManager, Key.class, Key_.user, userIdentifier);
  }

  @LockEntity(name = "key")
  private void _updateKey(Key key, KeyPatch patch) {
    key.mergeFromPassword(patch.getPassword());
    entityManager.persist(key);
  }

  @Override
  @WithEntityTransaction
  public void updateKey(long userIdentifier, KeyPatch patch) {
    Optional<Key> maybeKey =
        Optional.ofNullable(entityManager.find(Key.class, patch.getIdentifier()));
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key key = maybeKey.get();
    if (!Objects.equals(key.getUser().getIdentifier(), userIdentifier)) {
      throw new IllegalArgumentException();
    }
    _updateKey(key, patch);
  }

  @LockEntity(name = "key")
  private void _deleteKey(Key key) {
    entityManager.remove(key);
  }

  @Override
  @WithEntityTransaction
  public void deleteKey(long userIdentifier, long keyIdentifier) {
    Optional<Key> maybeKey = Optional.ofNullable(entityManager.find(Key.class, keyIdentifier));
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key key = maybeKey.get();
    if (!Objects.equals(key.getUser().getIdentifier(), userIdentifier)) {
      throw new IllegalArgumentException();
    }
    _deleteKey(key);
  }

  @LockEntity(name = "parent")
  private List<Key> _deleteShadows(Key parent) {
    // Shadow creation is guarded by `parent` lock.
    List<Key> shadows =
        Queries.findManyToOne(entityManager, Key.class, Key_.parent, parent.getIdentifier());
    shadows.forEach((item) -> entityManager.remove(item));
    return shadows;
  }

  @LockEntity(name = "target")
  private Tuple2<Key, List<Key>> _electShadow(long userId, Key target) {
    if (!target.getIsShadow()) {
      return Tuple.of(target, _deleteShadows(target));
    }
    Optional<Key> maybeParent = Optional.ofNullable(target.getParent());
    Password password = target.toPassword();
    if (!maybeParent.isPresent()) {
      Key newParent = createKey(userId, password, KeyAttrs.getDefaultInstance());
      entityManager.remove(target);
      return Tuple.of(newParent, ImmutableList.of(target));
    }
    Key parent = maybeParent.get();
    // Implicitly causes version increment.
    parent.mergeFromPassword(password);
    entityManager.persist(parent);
    return Tuple.of(parent, _deleteShadows(parent));
  }

  @Override
  @WithEntityTransaction
  public Tuple2<Key, List<Key>> electShadow(long userId, long shadowId) {
    Optional<Key> maybeTarget = Optional.ofNullable(entityManager.find(Key.class, shadowId));
    if (!maybeTarget.isPresent()) {
      throw new IllegalArgumentException();
    }
    Key target = maybeTarget.get();
    if (!Objects.equals(target.getUser().getIdentifier(), userId)) {
      throw new IllegalArgumentException();
    }
    return _electShadow(userId, target);
  }
}
