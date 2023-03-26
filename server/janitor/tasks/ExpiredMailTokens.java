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
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.MailToken_;

public final class ExpiredMailTokens implements Runnable {
  private Chronometry chronometry;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  ExpiredMailTokens(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<MailToken> criteriaDelete =
        criteriaBuilder.createCriteriaDelete(MailToken.class);
    Root<MailToken> mailTokenRoot = criteriaDelete.from(MailToken.class);
    criteriaDelete.where(
        criteriaBuilder.lessThan(
            mailTokenRoot.get(MailToken_.timestamp),
            chronometry.pastTimestamp(MailToken.MAIL_TOKEN_EXPIRATION_M, ChronoUnit.MINUTES)));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
