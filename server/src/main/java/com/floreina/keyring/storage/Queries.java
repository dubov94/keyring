package com.floreina.keyring.storage;

import com.floreina.keyring.entities.User;

import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import javax.persistence.metamodel.SingularAttribute;
import java.util.List;

class Queries {
  static <T> List<T> findByUser(
      EntityManager entityManager,
      Class<T> typeClass,
      SingularAttribute<T, User> userAttribute,
      long userIdentifier) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<T> criteriaQuery = criteriaBuilder.createQuery(typeClass);
    Root<T> root = criteriaQuery.from(typeClass);
    criteriaQuery
        .select(root)
        .where(criteriaBuilder.equal(root.get(userAttribute), userIdentifier));
    return entityManager.createQuery(criteriaQuery).getResultList();
  }
}
