package keyring.server.janitor.tasks;

import java.time.temporal.ChronoUnit;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Root;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.User;
import keyring.server.main.entities.User_;
import keyring.server.main.entities.columns.UserState;

public final class PendingUserExpiration implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  PendingUserExpiration(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaUpdate<User> criteriaUpdate = criteriaBuilder.createCriteriaUpdate(User.class);
    Root<User> userRoot = criteriaUpdate.from(User.class);
    criteriaUpdate.set(userRoot.get(User_.state), UserState.USER_DELETED);
    criteriaUpdate.where(
        criteriaBuilder.and(
            criteriaBuilder.equal(userRoot.get(User_.state), UserState.USER_PENDING),
            criteriaBuilder.lessThan(
                userRoot.get(User_.timestamp),
                chronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))));
    entityManager.createQuery(criteriaUpdate).executeUpdate();
  }
}
