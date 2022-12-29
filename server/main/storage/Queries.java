package keyring.server.main.storage;

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
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<T> cq = cb.createQuery(typeClass);
    Root<T> root = cq.from(typeClass);
    cq.select(root).where(cb.equal(root.get(attribute), parentId));
    return entityManager.createQuery(cq).getResultList();
  }

  static <T, P, V> long countRowsByValue(
      EntityManager entityManager, Class<T> typeClass, SingularAttribute<T, P> attribute, V value) {
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<Long> cq = cb.createQuery(Long.class);
    Root<T> root = cq.from(typeClass);
    cq.select(cb.count(root)).where(cb.equal(root.get(attribute), value));
    return (Long) entityManager.createQuery(cq).getSingleResult();
  }
}
