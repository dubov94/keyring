package keyring.server.main.storage;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
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

  private Key mustGetKey(UUID keyUuid) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<Key> criteriaQuery = criteriaBuilder.createQuery(Key.class);
    Root<Key> root = criteriaQuery.from(Key.class);
    criteriaQuery.select(root).where(criteriaBuilder.equal(root.get(Key_.uuid), keyUuid));
    Optional<Key> maybeKey =
        entityManager.createQuery(criteriaQuery).getResultList().stream().findFirst();
    if (!maybeKey.isPresent()) {
      throw new IllegalArgumentException(String.format("`Key` %s does not exist", keyUuid));
    }
    return maybeKey.get();
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private List<Key> _importKeys(Session session, List<Password> passwords) {
    User user = session.getUser();
    ImmutableList.Builder<Key> keys = ImmutableList.builder();
    for (Password password : passwords) {
      Key newKey = new Key().mergeFromPassword(password).setUser(user);
      entityManager.persist(newKey);
      keys.add(newKey);
    }
    return keys.build();
  }

  @Override
  @WithEntityTransaction
  public List<Key> importKeys(long sessionId, List<Password> passwords) {
    Session session = mustGetSession(sessionId);
    long userId = session.getUser().getIdentifier();
    limiters.checkKeysPerUser(entityManager, userId, passwords.size());
    return _importKeys(session, passwords);
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private Key _spawnKey(Session session, Password content, KeyAttrs attrs) {
    User user = session.getUser();
    Key newKey = new Key().mergeFromPassword(content).setUser(user);
    if (attrs.getIsShadow()) {
      newKey.setIsShadow(true);
    }
    String attrsParentUid = attrs.getParentUid();
    if (!attrsParentUid.isEmpty()) {
      Key parent = mustGetKey(UUID.fromString(attrsParentUid));
      if (!Objects.equals(parent.getUser().getIdentifier(), user.getIdentifier())) {
        throw new IllegalArgumentException(
            String.format("Parent %s does not belong to the user", attrsParentUid));
      }
      if (parent.getIsShadow()) {
        throw new IllegalArgumentException(
            String.format("Cannot create a shadow for %s as it's also a shadow", attrsParentUid));
      }
      newKey.setParent(parent);
    }
    entityManager.persist(newKey);
    return newKey;
  }

  @Override
  @WithEntityTransaction
  public Key createKey(long sessionId, Password content, KeyAttrs attrs) {
    if (!attrs.getIsShadow() && !attrs.getParentUid().isEmpty()) {
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
    Key key = mustGetKey(UUID.fromString(patch.getUid()));
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
  public void deleteKey(long sessionId, UUID keyUuid) {
    Session session = mustGetSession(sessionId);
    Key key = mustGetKey(keyUuid);
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
  public Tuple2<Key, List<Key>> electShadow(long sessionId, UUID shadowUid) {
    Session session = mustGetSession(sessionId);
    Key target = mustGetKey(shadowUid);
    long requesterId = session.getUser().getIdentifier();
    if (!Objects.equals(target.getUser().getIdentifier(), requesterId)) {
      throw new IllegalArgumentException(
          String.format(
              "`Key` %d does not belong to user %d", target.getIdentifier(), requesterId));
    }
    return _electShadow(session, target);
  }

  @LockEntity(name = "session")
  @ActivatedSession(name = "session")
  private void _togglePin(Session session, Key key, boolean isPinned) {
    key.setIsPinned(isPinned);
    entityManager.persist(key);
  }

  @Override
  @WithEntityTransaction
  public void togglePin(long sessionId, UUID keyUid, boolean isPinned) {
    Session session = mustGetSession(sessionId);
    Key key = mustGetKey(keyUid);
    long requesterId = session.getUser().getIdentifier();
    if (!Objects.equals(key.getUser().getIdentifier(), requesterId)) {
      throw new IllegalArgumentException(
          String.format("`Key` %d does not belong to user %d", key.getIdentifier(), requesterId));
    }
    _togglePin(session, key, isPinned);
  }
}
