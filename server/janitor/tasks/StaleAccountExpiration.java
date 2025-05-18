package keyring.server.janitor.tasks;

import com.google.common.collect.ImmutableList;
import java.time.Instant;
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
import keyring.server.main.entities.User;
import keyring.server.main.entities.User_;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.messagebroker.MessageBrokerClient;

public final class StaleAccountExpiration implements Runnable {
  public static final int INACTIVITY_PERIOD_YEARS = 2;
  public static final int DAYS_IN_YEAR = 365;
  public static final int DAYS_IN_MONTH = 30;
  public static final int DAYS_IN_WEEK = 7;

  private Chronometry chronometry;
  private MessageBrokerClient messageBrokerClient;

  @ContextualEntityManager private EntityManager entityManager;

  @Inject
  StaleAccountExpiration(Chronometry chronometry, MessageBrokerClient messageBrokerClient) {
    this.chronometry = chronometry;
    this.messageBrokerClient = messageBrokerClient;
  }

  @WithEntityManager
  @WithEntityTransaction
  public void run() {
    int inactivityPeriodDays = INACTIVITY_PERIOD_YEARS * DAYS_IN_YEAR;
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<User> criteriaQuery = criteriaBuilder.createQuery(User.class);
    Root<User> userRoot = criteriaQuery.from(User.class);
    criteriaQuery
        .select(userRoot)
        .where(
            criteriaBuilder.and(
                criteriaBuilder.equal(userRoot.get(User_.state), UserState.USER_ACTIVE),
                criteriaBuilder.lessThan(
                    userRoot.get(User_.lastSession),
                    chronometry.pastTimestamp(inactivityPeriodDays, ChronoUnit.DAYS))));
    List<User> entities =
        entityManager
            .createQuery(criteriaQuery)
            .setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .getResultList();
    for (User entity : entities) {
      Instant currentTime = chronometry.currentTime();
      List<Instant> inactivityReminders = entity.getInactivityReminders();
      if (inactivityReminders.size() == 0) {
        messageBrokerClient.publishDeactivationNotice(
            entity.getMail(), entity.getUsername(), INACTIVITY_PERIOD_YEARS, DAYS_IN_MONTH);
        entity.setInactivityReminders(ImmutableList.of(currentTime));
        entityManager.persist(entity);
        continue;
      }
      Instant latestReminder = inactivityReminders.get(inactivityReminders.size() - 1);
      if (inactivityReminders.size() >= 2) {
        if (latestReminder.isBefore(currentTime.minus(DAYS_IN_WEEK, ChronoUnit.DAYS))) {
          entity.setState(UserState.USER_DELETED);
          entityManager.persist(entity);
        }
      } else if (inactivityReminders.size() == 1) {
        if (latestReminder.isBefore(
            currentTime
                .minus(DAYS_IN_MONTH, ChronoUnit.DAYS)
                .plus(DAYS_IN_WEEK, ChronoUnit.DAYS))) {
          messageBrokerClient.publishDeactivationNotice(
              entity.getMail(), entity.getUsername(), INACTIVITY_PERIOD_YEARS, DAYS_IN_WEEK);
          entity.setInactivityReminders(
              ImmutableList.<Instant>builder()
                  .addAll(inactivityReminders)
                  .add(currentTime)
                  .build());
          entityManager.persist(entity);
        }
      }
    }
  }
}
