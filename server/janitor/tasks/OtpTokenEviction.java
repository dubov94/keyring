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
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.OtpToken_;

public final class OtpTokenEviction implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  OtpTokenEviction(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<OtpToken> criteriaDelete = criteriaBuilder.createCriteriaDelete(OtpToken.class);
    Root<OtpToken> otpTokenRoot = criteriaDelete.from(OtpToken.class);
    criteriaDelete.where(
        criteriaBuilder.and(
            criteriaBuilder.lessThan(
                otpTokenRoot.get(OtpToken_.creationTimestamp),
                chronometry.pastTimestamp(OtpToken.OTP_TOKEN_STORAGE_EVICTION_D, ChronoUnit.DAYS)),
            criteriaBuilder.isFalse(otpTokenRoot.get(OtpToken_.isInitial))));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
