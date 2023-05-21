package keyring.server.janitor.tasks;

import java.time.temporal.ChronoUnit;
import java.util.List;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
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
    CriteriaQuery<User> criteriaQuery = criteriaBuilder.createQuery(User.class);
    Root<User> userRoot = criteriaQuery.from(User.class);
    criteriaQuery.where(
        criteriaBuilder.and(
            criteriaBuilder.equal(userRoot.get(User_.state), UserState.USER_PENDING),
            criteriaBuilder.lessThan(
                userRoot.get(User_.timestamp),
                chronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))));
    List<User> entities =
        entityManager
            .createQuery(criteriaQuery)
            .setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .getResultList();
    for (User entity : entities) {
      entity.setState(UserState.USER_DELETED);
      entityManager.persist(entity);
    }
  }
}
