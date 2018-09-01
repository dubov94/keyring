package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.aspects.Annotations.EntityController;
import com.floreina.keyring.aspects.Annotations.LocalTransaction;
import com.floreina.keyring.entities.Key;
import com.floreina.keyring.entities.Key_;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.entities.Utilities;

import javax.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

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
    return Queries.findByUser(entityManager, Key.class, Key_.user, userIdentifier);
  }

  @Override
  @LocalTransaction
  public void updateKey(long userIdentifier, IdentifiedKey proto) {
    Optional<Key> maybeEntity =
        Optional.ofNullable(entityManager.find(Key.class, proto.getIdentifier()));
    if (maybeEntity.isPresent()) {
      Key entity = maybeEntity.get();
      if (entity.getUser().getIdentifier() == userIdentifier) {
        Utilities.updateKeyWithPassword(entity, proto.getPassword());
        entityManager.persist(entity);
        return;
      }
    }
    throw new IllegalArgumentException();
  }

  @Override
  @LocalTransaction
  public void deleteKey(long userIdentifier, long keyIdentifier) {
    Optional<Key> maybeEntity = Optional.ofNullable(entityManager.find(Key.class, keyIdentifier));
    if (maybeEntity.isPresent()) {
      Key entity = maybeEntity.get();
      if (entity.getUser().getIdentifier() == userIdentifier) {
        entityManager.remove(entity);
        return;
      }
    }
    throw new IllegalArgumentException();
  }
}
