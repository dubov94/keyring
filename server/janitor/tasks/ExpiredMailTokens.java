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
import server.main.entities.MailToken;
import server.main.entities.MailToken_;

public final class ExpiredMailTokens implements Runnable {
  private Chronometry chronometry;

  @EntityController private EntityManager entityManager;

  @Inject
  ExpiredMailTokens(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @LocalTransaction
  public void run() {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<MailToken> criteriaDelete =
        criteriaBuilder.createCriteriaDelete(MailToken.class);
    Root<MailToken> mailTokenRoot = criteriaDelete.from(MailToken.class);
    criteriaDelete.where(
        criteriaBuilder.lessThan(
            mailTokenRoot.get(MailToken_.timestamp),
            chronometry.pastTimestamp(10, ChronoUnit.MINUTES)));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
