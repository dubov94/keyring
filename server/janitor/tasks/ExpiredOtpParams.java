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
import server.main.entities.OtpParams;
import server.main.entities.OtpParams_;

public final class ExpiredOtpParams implements Runnable {
  private Chronometry chronometry;

  @EntityController private EntityManager entityManager;

  @Inject
  ExpiredOtpParams(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @LocalTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<OtpParams> criteriaDelete =
        criteriaBuilder.createCriteriaDelete(OtpParams.class);
    Root<OtpParams> otpParamsRoot = criteriaDelete.from(OtpParams.class);
    criteriaDelete.where(
        criteriaBuilder.lessThan(
            otpParamsRoot.get(OtpParams_.creationTimestamp),
            chronometry.pastTimestamp(10, ChronoUnit.MINUTES)));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
