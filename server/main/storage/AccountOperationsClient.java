package server.main.storage;

import server.main.Chronometry;
import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
import server.main.entities.*;
import server.main.proto.service.IdentifiedKey;
import server.main.proto.service.Password;

import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static java.util.stream.Collectors.toMap;

public class AccountOperationsClient implements AccountOperationsInterface {
  private Chronometry chronometry;
  @EntityController private EntityManager entityManager;

  AccountOperationsClient(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @Override
  @LocalTransaction
  public User createUser(String username, String salt, String hash, String mail, String code) {
    User user =
        new User().setState(User.State.PENDING).setUsername(username).setSalt(salt).setHash(hash);
    MailToken mailToken = new MailToken().setUser(user).setMail(mail).setCode(code);
    entityManager.persist(user);
    entityManager.persist(mailToken);
    return user;
  }

  @Override
  @LocalTransaction
  public void createMailToken(long userIdentifier, String mail, String code) {
    MailToken mailToken =
        new MailToken()
            .setUser(entityManager.getReference(User.class, userIdentifier))
            .setMail(mail)
            .setCode(code);
    entityManager.persist(mailToken);
  }

  @Override
  @LocalTransaction
  public Optional<MailToken> getMailToken(long userIdentifier, String token) {
    return Queries.findByUser(entityManager, MailToken.class, MailToken_.user, userIdentifier)
        .stream()
        .filter(mailToken -> Objects.equals(mailToken.getCode(), token))
        .findFirst();
  }

  @Override
  @LocalTransaction
  public void releaseMailToken(long tokenIdentifier) {
    Optional<MailToken> maybeMailToken =
        Optional.ofNullable(entityManager.find(MailToken.class, tokenIdentifier));
    if (maybeMailToken.isPresent()) {
      MailToken mailToken = maybeMailToken.get();
      Optional<User> maybeUser = Optional.ofNullable(mailToken.getUser());
      if (maybeUser.isPresent()) {
        User user = maybeUser.get();
        user.setMail(mailToken.getMail());
        if (Utilities.isUserActivated(user)) {
          user.setState(User.State.ACTIVE);
        }
        entityManager.persist(user);
        entityManager.remove(mailToken);
        return;
      }
    }
    throw new IllegalArgumentException();
  }

  @Override
  @LocalTransaction
  public Optional<User> getUserByName(String username) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<User> criteriaQuery = criteriaBuilder.createQuery(User.class);
    Root<User> root = criteriaQuery.from(User.class);
    criteriaQuery.select(root).where(criteriaBuilder.equal(root.get(User_.username), username));
    return entityManager.createQuery(criteriaQuery).getResultList().stream().findFirst();
  }

  @Override
  @LocalTransaction
  public Optional<User> getUserByIdentifier(long identifier) {
    return Optional.ofNullable(entityManager.find(User.class, identifier));
  }

  @Override
  @LocalTransaction
  public void changeMasterKey(
      long userIdentifier, String salt, String hash, List<IdentifiedKey> protos) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (maybeUser.isPresent()) {
      User user = maybeUser.get();
      user.setSalt(salt);
      user.setHash(hash);
      entityManager.persist(user);
      List<Key> entities = Queries.findByUser(entityManager, Key.class, Key_.user, userIdentifier);
      Map<Long, Password> keyIdentifierToProto =
          protos.stream().collect(toMap(IdentifiedKey::getIdentifier, IdentifiedKey::getPassword));
      for (Key entity : entities) {
        Optional<Password> maybeProto =
            Optional.ofNullable(keyIdentifierToProto.get(entity.getIdentifier()));
        if (!maybeProto.isPresent()) {
          throw new IllegalArgumentException();
        } else {
          Password proto = maybeProto.get();
          Utilities.updateKeyWithPassword(entity, proto);
          entityManager.persist(entity);
        }
      }
    } else {
      throw new IllegalArgumentException();
    }
  }

  @Override
  @LocalTransaction
  public void changeUsername(long userIdentifier, String username) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (maybeUser.isPresent()) {
      User user = maybeUser.get();
      user.setUsername(username);
      entityManager.persist(user);
    } else {
      throw new IllegalArgumentException();
    }
  }

  @Override
  @LocalTransaction
  public void createSession(long userIdentifier, String key, String ipAddress, String userAgent) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (maybeUser.isPresent()) {
      User user = maybeUser.get();
      user.setLastSession(chronometry.currentTime());
      entityManager.persist(user);
      Session session =
          new Session()
              .setUser(entityManager.getReference(User.class, userIdentifier))
              .setKey(key)
              .setIpAddress(ipAddress)
              .setUserAgent(userAgent);
      entityManager.persist(session);
    } else {
      throw new IllegalArgumentException();
    }
  }

  @Override
  @LocalTransaction
  public List<Session> readSessions(long userIdentifier) {
    return Queries.findByUser(entityManager, Session.class, Session_.user, userIdentifier);
  }

  @Override
  @LocalTransaction
  public void markAccountAsDeleted(long userIdentifier) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (maybeUser.isPresent()) {
      User user = maybeUser.get();
      user.setState(User.State.DELETED);
      entityManager.persist(user);
    } else {
      throw new IllegalArgumentException();
    }
  }
}