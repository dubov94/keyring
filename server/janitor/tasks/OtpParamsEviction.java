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
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.OtpParams_;

public final class OtpParamsEviction implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  OtpParamsEviction(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<OtpParams> criteriaDelete =
        criteriaBuilder.createCriteriaDelete(OtpParams.class);
    Root<OtpParams> otpParamsRoot = criteriaDelete.from(OtpParams.class);
    criteriaDelete.where(
        criteriaBuilder.lessThan(
            otpParamsRoot.get(OtpParams_.creationTimestamp),
            chronometry.pastTimestamp(
                OtpParams.OTP_PARAMS_STORAGE_EVICTION_M, ChronoUnit.MINUTES)));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
