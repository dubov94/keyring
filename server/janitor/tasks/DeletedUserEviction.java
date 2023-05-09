package keyring.server.janitor.tasks;

import java.time.temporal.ChronoUnit;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.Root;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.User;
import keyring.server.main.entities.User_;
import keyring.server.main.entities.columns.UserState;

public final class DeletedUserEviction implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  DeletedUserEviction(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<User> criteriaDelete = criteriaBuilder.createCriteriaDelete(User.class);
    Root<User> userRoot = criteriaDelete.from(User.class);
    criteriaDelete.where(
        criteriaBuilder.and(
            criteriaBuilder.equal(userRoot.get(User_.state), UserState.USER_DELETED),
            criteriaBuilder.lessThan(
                userRoot.get(User_.timestamp),
                chronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
