package com.floreina.keyring.database;

import com.floreina.keyring.entities.Key;
import com.floreina.keyring.entities.Key_;
import com.floreina.keyring.entities.User_;

import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import java.util.List;

class Queries {
  static List<Key> findKeys(EntityManager entityManager, long userIdentifier) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<Key> criteriaQuery = criteriaBuilder.createQuery(Key.class);
    Root<Key> root = criteriaQuery.from(Key.class);
    criteriaQuery
        .select(root)
        .where(criteriaBuilder.equal(root.get(Key_.user).get(User_.identifier), userIdentifier));
    return entityManager.createQuery(criteriaQuery).getResultList();
  }
}
