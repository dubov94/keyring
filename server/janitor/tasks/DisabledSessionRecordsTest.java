package keyring.server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.Persistence;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.SessionStage;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
final class DisabledSessionRecordsTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private EntityManager entityManager;
  private DisabledSessionRecords disabledSessionRecords;

  @Mock private Chronometry mockChronometry;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    entityManager = entityManagerFactory.createEntityManager();
    disabledSessionRecords = new DisabledSessionRecords(mockChronometry);
    when(mockChronometry.currentTime()).thenReturn(Instant.now());
  }

  @Test
  void relevantInitiated_keeps() {
    when(mockChronometry.pastTimestamp(Session.AUTHN_DURATION_S, ChronoUnit.SECONDS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(1)));
    when(mockChronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))
        .thenReturn(Timestamp.from(Instant.now()));
    User user = new User().setUsername(newRandomUuid());
    persistEntity(user);
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.SESSION_INITIATED, Instant.ofEpochSecond(2));
    persistEntity(session);

    disabledSessionRecords.run();

    entityManager.refresh(session);
    assertEquals(SessionStage.SESSION_INITIATED, session.getStage());
  }

  @Test
  void expiredInitiated_disables() {
    when(mockChronometry.pastTimestamp(Session.AUTHN_DURATION_S, ChronoUnit.SECONDS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(2)));
    when(mockChronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))
        .thenReturn(Timestamp.from(Instant.now()));
    User user = new User().setUsername(newRandomUuid());
    persistEntity(user);
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.SESSION_INITIATED, Instant.ofEpochSecond(1));
    persistEntity(session);

    disabledSessionRecords.run();

    entityManager.refresh(session);
    assertEquals(SessionStage.SESSION_DISABLED, session.getStage());
  }

  @Test
  void relevantActivated_keeps() {
    when(mockChronometry.pastTimestamp(Session.AUTHN_DURATION_S, ChronoUnit.SECONDS))
        .thenReturn(Timestamp.from(Instant.now()));
    when(mockChronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(1)));
    User user = new User().setUsername(newRandomUuid());
    persistEntity(user);
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.SESSION_ACTIVATED, Instant.ofEpochSecond(2));
    persistEntity(session);

    disabledSessionRecords.run();

    entityManager.refresh(session);
    assertEquals(SessionStage.SESSION_ACTIVATED, session.getStage());
  }

  @Test
  void expiredActivated_disables() {
    when(mockChronometry.pastTimestamp(Session.AUTHN_DURATION_S, ChronoUnit.SECONDS))
        .thenReturn(Timestamp.from(Instant.now()));
    when(mockChronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(2)));
    User user = new User().setUsername(newRandomUuid());
    persistEntity(user);
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.SESSION_ACTIVATED, Instant.ofEpochSecond(1));
    persistEntity(session);

    disabledSessionRecords.run();

    entityManager.refresh(session);
    assertEquals(SessionStage.SESSION_DISABLED, session.getStage());
  }

  private String newRandomUuid() {
    return UUID.randomUUID().toString();
  }

  private void persistEntity(Object entity) {
    EntityTransaction entityTransaction = entityManager.getTransaction();
    entityTransaction.begin();
    entityManager.persist(entity);
    entityTransaction.commit();
  }
}
