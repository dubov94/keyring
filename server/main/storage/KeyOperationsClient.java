package keyring.server.main.storage;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import javax.persistence.EntityManager;
import keyring.server.main.aspects.Annotations.ActivatedSession;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.LockEntity;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.Key_;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.proto.service.KeyAttrs;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;

public class KeyOperationsClient implements KeyOperationsInterface {
  private final Limiters limiters;

  @ContextualEntityManager private EntityManager entityManager;

  KeyOperationsClient(Limiters limiters) {
    this.limiters = limiters;
  }

  private Session mustGetSession(long sessionId) {
    Optional<Session> maybeSession =
        Optional.ofNullable(entityManager.find(Session.class, sessionId));
    if (!maybeSession.isPresent()) {
      throw new IllegalArgumentException(String.format("`Session` %d does not exist", sessionId));
    }
    return maybeSession.get();
  }

  private Key mustGetKey(long keyId) {
    Optional<Key> maybeKey = Optional.ofNullable(entityManager.find(Key.class, keyId));
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException(String.format("`Key` %d does not exist", keyId));
    }
    return maybeKey.get();
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private Key _spawnKey(Session session, Password content, KeyAttrs attrs) {
    User user = session.getUser();
    Key newKey = new Key().mergeFromPassword(content).setUser(user);
    if (attrs.getIsShadow()) {
      newKey.setIsShadow(true);
    }
    long attrsParent = attrs.getParent();
    if (attrsParent != 0) {
      Key parent = entityManager.find(Key.class, attrsParent);
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
  public Key createKey(long sessionId, Password content, KeyAttrs attrs) {
    if (!attrs.getIsShadow() && attrs.getParent() != 0) {
      throw new IllegalArgumentException(String.format("Shadows must have a non-nil parent"));
    }
    Session session = mustGetSession(sessionId);
    long userId = session.getUser().getIdentifier();
    limiters.checkKeysPerUser(entityManager, userId, /* toAdd */ 1);
    return _spawnKey(session, content, attrs);
  }

  @ActivatedSession(name = "session")
  public List<Key> _readKeys(Session session) {
    return Queries.findManyToOne(
        entityManager, Key.class, Key_.user, session.getUser().getIdentifier());
  }

  @Override
  @WithEntityTransaction
  public List<Key> readKeys(long sessionId) {
    return _readKeys(mustGetSession(sessionId));
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private void _updateKey(Session session, Key key, KeyPatch patch) {
    key.mergeFromPassword(patch.getPassword());
    entityManager.persist(key);
  }

  @Override
  @WithEntityTransaction
  public void updateKey(long sessionId, KeyPatch patch) {
    Session session = mustGetSession(sessionId);
    Key key = mustGetKey(patch.getIdentifier());
    long requesterId = session.getUser().getIdentifier();
    if (!Objects.equals(key.getUser().getIdentifier(), requesterId)) {
      throw new IllegalArgumentException(
          String.format("`Key` %d does not belong to user %d", key.getIdentifier(), requesterId));
    }
    _updateKey(session, key, patch);
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private void _deleteKey(Session session, Key key) {
    entityManager.remove(key);
  }

  @Override
  @WithEntityTransaction
  public void deleteKey(long sessionId, long keyId) {
    Session session = mustGetSession(sessionId);
    Key key = mustGetKey(keyId);
    long requesterId = session.getUser().getIdentifier();
    if (!Objects.equals(key.getUser().getIdentifier(), requesterId)) {
      throw new IllegalArgumentException(
          String.format("`Key` %d does not belong to user %d", key.getIdentifier(), requesterId));
    }
    _deleteKey(session, key);
  }

  private List<Key> _deleteShadows(Key parent) {
    // Currently late `createKey` may spawn a redundant shadow.
    List<Key> shadows =
        Queries.findManyToOne(entityManager, Key.class, Key_.parent, parent.getIdentifier());
    shadows.forEach((item) -> entityManager.remove(item));
    return shadows;
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private Tuple2<Key, List<Key>> _electShadow(Session session, Key target) {
    if (!target.getIsShadow()) {
      return Tuple.of(target, _deleteShadows(target));
    }
    Optional<Key> maybeParent = Optional.ofNullable(target.getParent());
    Password password = target.toPassword();
    if (!maybeParent.isPresent()) {
      Key newParent = createKey(session.getIdentifier(), password, KeyAttrs.getDefaultInstance());
      entityManager.remove(target);
      return Tuple.of(newParent, ImmutableList.of(target));
    }
    Key parent = maybeParent.get();
    parent.mergeFromPassword(password);
    entityManager.persist(parent);
    return Tuple.of(parent, _deleteShadows(parent));
  }

  @Override
  @WithEntityTransaction
  public Tuple2<Key, List<Key>> electShadow(long sessionId, long shadowId) {
    Session session = mustGetSession(sessionId);
    Key target = mustGetKey(shadowId);
    long requesterId = session.getUser().getIdentifier();
    if (!Objects.equals(target.getUser().getIdentifier(), requesterId)) {
      throw new IllegalArgumentException(
          String.format(
              "`Key` %d does not belong to user %d", target.getIdentifier(), requesterId));
    }
    return _electShadow(session, target);
  }
}
