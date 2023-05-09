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
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
final class PendingUserExpirationTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private EntityManager entityManager;
  private PendingUserExpiration pendingUserExpiration;

  @Mock private Chronometry mockChronometry;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    entityManager = entityManagerFactory.createEntityManager();
    pendingUserExpiration = new PendingUserExpiration(mockChronometry);
  }

  @Test
  void oldActiveUser_keeps() {
    User user = new User().setState(UserState.USER_ACTIVE).setUsername(newRandomUuid());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));

    pendingUserExpiration.run();

    entityManager.refresh(user);
    assertEquals(UserState.USER_ACTIVE, user.getState());
  }

  @Test
  void newPendingUser_keeps() {
    User user = new User().setState(UserState.USER_PENDING).setUsername(newRandomUuid());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.EPOCH));

    pendingUserExpiration.run();

    entityManager.refresh(user);
    assertEquals(UserState.USER_PENDING, user.getState());
  }

  @Test
  void oldPendingUser_deletes() {
    User user = new User().setState(UserState.USER_PENDING).setUsername(newRandomUuid());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));

    pendingUserExpiration.run();

    entityManager.refresh(user);
    assertEquals(UserState.USER_DELETED, user.getState());
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
