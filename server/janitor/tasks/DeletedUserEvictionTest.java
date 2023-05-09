package keyring.server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityNotFoundException;
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
final class DeletedUserEvictionTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private EntityManager entityManager;
  private DeletedUserEviction deletedUserEviction;

  @Mock private Chronometry mockChronometry;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    entityManager = entityManagerFactory.createEntityManager();
    deletedUserEviction = new DeletedUserEviction(mockChronometry);
  }

  @Test
  void oldActiveUser_keeps() {
    User user = new User().setState(UserState.USER_ACTIVE).setUsername(newRandomUuid());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.now()));

    deletedUserEviction.run();

    assertTrue(isEntityInStorage(user));
  }

  @Test
  void newDeletedUser_keeps() {
    User user = new User().setState(UserState.USER_DELETED).setUsername(newRandomUuid());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.EPOCH));

    deletedUserEviction.run();

    assertTrue(isEntityInStorage(user));
  }

  @Test
  void oldDeletedUser_removes() {
    User user = new User().setState(UserState.USER_DELETED).setUsername(newRandomUuid());
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.now()));

    deletedUserEviction.run();

    assertFalse(isEntityInStorage(user));
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

  private boolean isEntityInStorage(Object entity) {
    try {
      entityManager.refresh(entity);
      return true;
    } catch (EntityNotFoundException exception) {
      return false;
    }
  }
}
