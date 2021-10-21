package server.main.storage;

import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import javax.persistence.metamodel.SingularAttribute;

class Queries {
  static <T, P> List<T> findManyToOne(
      EntityManager entityManager,
      Class<T> typeClass,
      SingularAttribute<T, P> attribute,
      long parentId) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<T> criteriaQuery = criteriaBuilder.createQuery(typeClass);
    Root<T> root = criteriaQuery.from(typeClass);
    criteriaQuery.select(root).where(criteriaBuilder.equal(root.get(attribute), parentId));
    return entityManager.createQuery(criteriaQuery).getResultList();
  }
}
