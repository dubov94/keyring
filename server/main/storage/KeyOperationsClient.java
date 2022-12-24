package keyring.server.main.storage;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import javax.persistence.EntityManager;
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
  @ContextualEntityManager private EntityManager entityManager;

  private Session mustGetSession(long sessionId) {
    Optional<Session> maybeSession =
        Optional.ofNullable(entityManager.find(Session.class, sessionId));
    if (!maybeSession.isPresent()) {
      throw new IllegalArgumentException();
    }
    return maybeSession.get();
  }

  private Key mustGetKey(long keyId) {
    Optional<Key> maybeKey = Optional.ofNullable(entityManager.find(Key.class, keyId));
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException();
    }
    return maybeKey.get();
  }

  private void validateSession(Session session) {
    if (!session.isActivated()) {
      throw new IllegalArgumentException();
    }
  }

  @LockEntity(name = "session")
  private Key _spawnKey(Session session, Password content, KeyAttrs attrs) {
    validateSession(session);
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
      throw new IllegalArgumentException();
    }
    Session session = mustGetSession(sessionId);
    return _spawnKey(session, content, attrs);
  }

  @Override
  @WithEntityTransaction
  public List<Key> readKeys(long sessionId) {
    Session session = mustGetSession(sessionId);
    validateSession(session);
    return Queries.findManyToOne(
        entityManager, Key.class, Key_.user, session.getUser().getIdentifier());
  }

  @LockEntity(name = "session")
  private void _updateKey(Session session, Key key, KeyPatch patch) {
    validateSession(session);
    key.mergeFromPassword(patch.getPassword());
    entityManager.persist(key);
  }

  @Override
  @WithEntityTransaction
  public void updateKey(long sessionId, KeyPatch patch) {
    Session session = mustGetSession(sessionId);
    Key key = mustGetKey(patch.getIdentifier());
    if (!Objects.equals(key.getUser().getIdentifier(), session.getUser().getIdentifier())) {
      throw new IllegalArgumentException();
    }
    _updateKey(session, key, patch);
  }

  @LockEntity(name = "session")
  private void _deleteKey(Session session, Key key) {
    validateSession(session);
    entityManager.remove(key);
  }

  @Override
  @WithEntityTransaction
  public void deleteKey(long sessionId, long keyId) {
    Session session = mustGetSession(sessionId);
    Key key = mustGetKey(keyId);
    if (!Objects.equals(key.getUser().getIdentifier(), session.getUser().getIdentifier())) {
      throw new IllegalArgumentException();
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
  private Tuple2<Key, List<Key>> _electShadow(Session session, Key target) {
    validateSession(session);
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
    if (!Objects.equals(target.getUser().getIdentifier(), session.getUser().getIdentifier())) {
      throw new IllegalArgumentException();
    }
    return _electShadow(session, target);
  }
}
