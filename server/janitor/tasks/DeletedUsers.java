package keyring.server.janitor.tasks;

import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.Root;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.User;
import keyring.server.main.entities.User_;
import keyring.server.main.entities.columns.UserState;

public final class DeletedUsers implements Runnable {
  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  DeletedUsers() {}

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<User> criteriaDelete = criteriaBuilder.createCriteriaDelete(User.class);
    Root<User> userRoot = criteriaDelete.from(User.class);
    criteriaDelete.where(criteriaBuilder.equal(userRoot.get(User_.state), UserState.DELETED));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
