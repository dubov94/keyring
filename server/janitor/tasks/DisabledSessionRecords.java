package keyring.server.janitor.tasks;

import java.sql.Timestamp;
import java.time.temporal.ChronoUnit;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.Session_;
import keyring.server.main.entities.columns.SessionStage;

public final class DisabledSessionRecords implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  DisabledSessionRecords(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaUpdate<Session> criteriaUpdate = criteriaBuilder.createCriteriaUpdate(Session.class);
    Root<Session> sessionRoot = criteriaUpdate.from(Session.class);
    // if_change(session_disablement)
    criteriaUpdate.set(sessionRoot.get(Session_.stage), SessionStage.DISABLED);
    criteriaUpdate.set(
        sessionRoot.get(Session_.lastStageChange), Timestamp.from(chronometry.currentTime()));
    // then_change
    Predicate predicateForInitiated =
        criteriaBuilder.and(
            criteriaBuilder.equal(sessionRoot.get(Session_.stage), SessionStage.INITIATED),
            criteriaBuilder.lessThan(
                sessionRoot.get(Session_.lastStageChange),
                chronometry.pastTimestamp(Session.AUTHN_DURATION_S, ChronoUnit.SECONDS)));
    Predicate predicateForActivated =
        criteriaBuilder.and(
            criteriaBuilder.equal(sessionRoot.get(Session_.stage), SessionStage.ACTIVATED),
            criteriaBuilder.lessThan(
                sessionRoot.get(Session_.lastStageChange),
                // Technically this is an upper bound.
                chronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS)));
    criteriaUpdate.where(criteriaBuilder.or(predicateForInitiated, predicateForActivated));
    entityManager.createQuery(criteriaUpdate).executeUpdate();
  }
}
