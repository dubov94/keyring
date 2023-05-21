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
import keyring.server.main.entities.Session;
import keyring.server.main.entities.Session_;
import keyring.server.main.entities.columns.SessionStage;

public final class ActivatedSessionExpiration implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  ActivatedSessionExpiration(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<Session> criteriaQuery = criteriaBuilder.createQuery(Session.class);
    Root<Session> sessionRoot = criteriaQuery.from(Session.class);
    criteriaQuery
        .select(sessionRoot)
        .where(
            criteriaBuilder.and(
                criteriaBuilder.equal(
                    sessionRoot.get(Session_.stage), SessionStage.SESSION_ACTIVATED),
                criteriaBuilder.lessThan(
                    sessionRoot.get(Session_.lastStageChange),
                    // Technically this is an upper bound.
                    chronometry.pastTimestamp(
                        Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))));
    List<Session> entities =
        entityManager
            .createQuery(criteriaQuery)
            .setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .getResultList();
    for (Session entity : entities) {
      entity.setStage(SessionStage.SESSION_DISABLED, chronometry.currentTime());
      entityManager.persist(entity);
    }
  }
}
