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
import keyring.server.main.messagebroker.MessageBrokerClient;

public final class InitiatedSessionExpiration implements Runnable {
  private Chronometry chronometry;
  private MessageBrokerClient messageBrokerClient;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  InitiatedSessionExpiration(Chronometry chronometry, MessageBrokerClient messageBrokerClient) {
    this.chronometry = chronometry;
    this.messageBrokerClient = messageBrokerClient;
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
                    sessionRoot.get(Session_.stage), SessionStage.SESSION_INITIATED),
                criteriaBuilder.lessThan(
                    sessionRoot.get(Session_.lastStageChange),
                    chronometry.pastTimestamp(
                        Session.SESSION_AUTHN_EXPIRATION_M, ChronoUnit.MINUTES))));
    List<Session> entities =
        entityManager
            .createQuery(criteriaQuery)
            .setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .getResultList();
    for (Session entity : entities) {
      messageBrokerClient.publishUncompletedAuthn(
          entity.getUser().getMail(), entity.getIpAddress());
      entity.setStage(SessionStage.SESSION_DISABLED, chronometry.currentTime());
      entityManager.persist(entity);
    }
  }
}
