package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.aspects.Annotations.EntityController;
import com.floreina.keyring.aspects.Annotations.LocalTransaction;
import com.floreina.keyring.entities.*;

import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static java.util.stream.Collectors.toMap;

public class AccountingClient implements AccountingInterface {
  @EntityController private EntityManager entityManager;

  @Override
  @LocalTransaction
  public User createUserWithActivation(
      String username, String salt, String digest, String mail, String code) {
    User user =
        new User()
            .setState(User.State.PENDING)
            .setUsername(username)
            .setSalt(salt)
            .setDigest(digest)
            .setMail(mail);
    Activation activation = new Activation().setUser(user).setCode(code);
    entityManager.persist(activation);
    return user;
  }

  @Override
  @LocalTransaction
  public Optional<Activation> getActivationByUser(long identifier) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<Activation> criteriaQuery = criteriaBuilder.createQuery(Activation.class);
    Root<Activation> root = criteriaQuery.from(Activation.class);
    criteriaQuery
        .select(root)
        .where(criteriaBuilder.equal(root.get(Activation_.user).get(User_.identifier), identifier));
    return entityManager.createQuery(criteriaQuery).getResultList().stream().findFirst();
  }

  @Override
  @LocalTransaction
  public void activateUser(long identifier) {
    Optional<Activation> maybeActivation = getActivationByUser(identifier);
    if (maybeActivation.isPresent()) {
      Activation activation = maybeActivation.get();
      entityManager.remove(activation);
      User user = activation.getUser().setState(User.State.ACTIVE);
      entityManager.persist(user);
      return;
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
      long userIdentifier, String salt, String digest, List<IdentifiedKey> protos) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (maybeUser.isPresent()) {
      User user = maybeUser.get();
      user.setSalt(salt);
      user.setDigest(digest);
      entityManager.persist(user);
      List<Key> entities = Queries.findKeys(entityManager, userIdentifier);
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
      return;
    }
    throw new IllegalArgumentException();
  }
}
