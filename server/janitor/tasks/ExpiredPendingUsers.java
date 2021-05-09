package server.janitor.tasks;

import java.time.temporal.ChronoUnit;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.Root;
import server.main.Chronometry;
import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
import server.main.entities.User;
import server.main.entities.User_;

public final class ExpiredPendingUsers implements Runnable {
  private Chronometry chronometry;

  @EntityController private EntityManager entityManager;

  @Inject
  ExpiredPendingUsers(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @LocalTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<User> criteriaDelete = criteriaBuilder.createCriteriaDelete(User.class);
    Root<User> userRoot = criteriaDelete.from(User.class);
    criteriaDelete.where(
        criteriaBuilder.and(
            criteriaBuilder.equal(userRoot.get(User_.state), User.State.PENDING),
            criteriaBuilder.lessThan(
                userRoot.get(User_.timestamp), chronometry.pastTimestamp(15, ChronoUnit.MINUTES))));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
