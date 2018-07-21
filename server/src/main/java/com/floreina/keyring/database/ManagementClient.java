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

public class ManagementClient implements ManagementInterface {
  @EntityController private EntityManager entityManager;

  @Override
  @LocalTransaction
  public Key createKey(long userIdentifier, Password proto) {
    Key entity = Utilities.passwordToKey(proto).setUser(new User().setIdentifier(userIdentifier));
    entityManager.persist(entity);
    return entity;
  }

  @Override
  @LocalTransaction
  public List<Key> readKeys(long userIdentifier) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<Key> criteriaQuery = criteriaBuilder.createQuery(Key.class);
    Root<Key> root = criteriaQuery.from(Key.class);
    criteriaQuery
        .select(root)
        .where(criteriaBuilder.equal(root.get(Key_.user).get(User_.identifier), userIdentifier));
    return entityManager.createQuery(criteriaQuery).getResultList();
  }

  @Override
  @LocalTransaction
  public void updateKey(long userIdentifier, IdentifiedKey proto) {
    Key entity = entityManager.find(Key.class, proto.getIdentifier());
    if (entity.getUser().getIdentifier() == userIdentifier) {
      Key update = Utilities.passwordToKey(proto.getPassword());
      entity.setValue(update.getValue());
      entity.setTags(update.getTags());
      entityManager.persist(entity);
    } else {
      throw new IllegalArgumentException();
    }
  }

  @Override
  @LocalTransaction
  public void deleteKey(long userIdentifier, long keyIdentifier) {
    Key entity = entityManager.find(Key.class, keyIdentifier);
    if (entity.getUser().getIdentifier() == userIdentifier) {
      entityManager.remove(entity);
    } else {
      throw new IllegalArgumentException();
    }
  }
}
