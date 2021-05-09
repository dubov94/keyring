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
import server.main.entities.Session;
import server.main.entities.Session_;

public final class ExpiredSessionRecords implements Runnable {
  private Chronometry chronometry;

  @EntityController private EntityManager entityManager;

  @Inject
  ExpiredSessionRecords(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @LocalTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<Session> criteriaDelete = criteriaBuilder.createCriteriaDelete(Session.class);
    Root<Session> sessionRoot = criteriaDelete.from(Session.class);
    criteriaDelete.where(
        criteriaBuilder.lessThan(
            sessionRoot.get(Session_.timestamp), chronometry.pastTimestamp(28, ChronoUnit.DAYS)));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
