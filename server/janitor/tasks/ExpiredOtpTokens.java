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
import server.main.entities.OtpToken;
import server.main.entities.OtpToken_;

public final class ExpiredOtpTokens implements Runnable {
  private Chronometry chronometry;

  @EntityController private EntityManager entityManager;

  @Inject
  ExpiredOtpTokens(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @LocalTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<OtpToken> criteriaDelete = criteriaBuilder.createCriteriaDelete(OtpToken.class);
    Root<OtpToken> otpTokenRoot = criteriaDelete.from(OtpToken.class);
    criteriaDelete.where(
        criteriaBuilder.and(
            criteriaBuilder.lessThan(
                otpTokenRoot.get(OtpToken_.creationTimestamp),
                chronometry.pastTimestamp(3 * 28, ChronoUnit.DAYS)),
            criteriaBuilder.isFalse(otpTokenRoot.get(OtpToken_.isInitial))));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
