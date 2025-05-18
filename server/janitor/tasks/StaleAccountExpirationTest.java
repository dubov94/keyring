package keyring.server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import com.google.common.collect.ImmutableList;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.persistence.EntityManager;
import javax.persistence.Persistence;
import keyring.server.main.Arithmetic;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.messagebroker.MessageBrokerClient;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.utility.DockerImageName;

@ExtendWith(MockitoExtension.class)
final class StaleAccountExpirationTest {
  @Container
  private static final PostgreSQLContainer<?> postgresContainer =
      new PostgreSQLContainer<>(DockerImageName.parse("postgres"));

  @ContextualEntityManager private EntityManager entityManager;

  private StaleAccountExpiration staleAccountExpiration;
  private static final String MAIL = "mail@example.com";

  @Mock private MessageBrokerClient mockMessageBrokerClient;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
    staleAccountExpiration =
        new StaleAccountExpiration(
            new Chronometry(new Arithmetic(), () -> Instant.now()), mockMessageBrokerClient);
  }

  @Test
  @WithEntityManager
  void freshAccount_keeps() {
    User user =
        new User()
            .setUsername("username")
            .setState(UserState.USER_ACTIVE)
            .setMail(MAIL)
            .setLastSession(Instant.now());
    persistEntity(user);

    staleAccountExpiration.run();

    refreshEntity(user);
    assertEquals(UserState.USER_ACTIVE, user.getState());
    verifyNoMoreInteractions(mockMessageBrokerClient);
  }

  @Test
  @WithEntityManager
  void staleAccount_deletes() {
    Instant now = Instant.now();
    User user =
        new User()
            .setUsername("username")
            .setState(UserState.USER_ACTIVE)
            .setMail(MAIL)
            .setLastSession(dayAgo(monthAgo(inactivityPeriodAgo(now))))
            .setInactivityReminders(ImmutableList.of(dayAgo(monthAgo(now)), dayAgo(weekAgo(now))));
    persistEntity(user);

    staleAccountExpiration.run();

    refreshEntity(user);
    assertEquals(UserState.USER_DELETED, user.getState());
    verifyNoMoreInteractions(mockMessageBrokerClient);
  }

  @Test
  @WithEntityManager
  void firstNotice_sends() {
    Instant now = Instant.now();
    User user =
        new User()
            .setUsername("username")
            .setState(UserState.USER_ACTIVE)
            .setMail(MAIL)
            .setLastSession(dayAgo(inactivityPeriodAgo(now)));
    persistEntity(user);

    staleAccountExpiration.run();

    verify(mockMessageBrokerClient)
        .publishDeactivationNotice(
            user.getMail(),
            user.getUsername(),
            StaleAccountExpiration.INACTIVITY_PERIOD_YEARS,
            StaleAccountExpiration.DAYS_IN_MONTH);
    verifyNoMoreInteractions(mockMessageBrokerClient);
  }

  @Test
  @WithEntityManager
  void finalNotice_sends() {
    User user =
        new User()
            .setState(UserState.USER_ACTIVE)
            .setMail(MAIL)
            .setLastSession(dayHence(monthAgo(inactivityPeriodAgo(Instant.now()))))
            .setInactivityReminders(ImmutableList.of(dayHence(monthAgo(Instant.now()))));
    persistEntity(user);

    staleAccountExpiration.run();

    verify(mockMessageBrokerClient)
        .publishDeactivationNotice(
            user.getMail(),
            user.getUsername(),
            StaleAccountExpiration.INACTIVITY_PERIOD_YEARS,
            StaleAccountExpiration.DAYS_IN_WEEK);
    verifyNoMoreInteractions(mockMessageBrokerClient);
  }

  @WithEntityTransaction
  private void persistEntity(Object entity) {
    entityManager.persist(entity);
  }

  @WithEntityTransaction
  private void refreshEntity(Object entity) {
    entityManager.refresh(entity);
  }

  private Instant inactivityPeriodAgo(Instant instant) {
    return instant.minus(
        StaleAccountExpiration.INACTIVITY_PERIOD_YEARS * StaleAccountExpiration.DAYS_IN_YEAR,
        ChronoUnit.DAYS);
  }

  private Instant monthAgo(Instant instant) {
    return instant.minus(StaleAccountExpiration.DAYS_IN_MONTH, ChronoUnit.DAYS);
  }

  private Instant weekAgo(Instant instant) {
    return instant.minus(StaleAccountExpiration.DAYS_IN_WEEK, ChronoUnit.DAYS);
  }

  private Instant dayAgo(Instant instant) {
    return instant.minus(1, ChronoUnit.DAYS);
  }

  private Instant dayHence(Instant instant) {
    return instant.plus(1, ChronoUnit.DAYS);
  }
}
