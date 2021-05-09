package server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.persistence.*;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import server.main.Chronometry;
import server.main.aspects.StorageManagerAspect;
import server.main.entities.User;

@ExtendWith(MockitoExtension.class)
final class ExpiredPendingUsersTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private EntityManager entityManager;
  private ExpiredPendingUsers expiredPendingUsers;

  @Mock private Chronometry mockChronometry;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    entityManager = entityManagerFactory.createEntityManager();
    expiredPendingUsers = new ExpiredPendingUsers(mockChronometry);
  }

  @Test
  void oldActiveUser_keeps() {
    User user = new User().setState(User.State.ACTIVE).setUsername(createUniqueUsername());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(15, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));

    expiredPendingUsers.run();

    assertTrue(isEntityInStorage(user));
  }

  @Test
  void oldPendingUser_removes() {
    User user = new User().setState(User.State.PENDING).setUsername(createUniqueUsername());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(15, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));

    expiredPendingUsers.run();

    assertFalse(isEntityInStorage(user));
  }

  private String createUniqueUsername() {
    return UUID.randomUUID().toString();
  }

  private void persistEntity(Object entity) {
    EntityTransaction entityTransaction = entityManager.getTransaction();
    entityTransaction.begin();
    entityManager.persist(entity);
    entityTransaction.commit();
  }

  private boolean isEntityInStorage(Object entity) {
    try {
      entityManager.refresh(entity);
      return true;
    } catch (EntityNotFoundException exception) {
      return false;
    }
  }
}
