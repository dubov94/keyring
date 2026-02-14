package keyring.server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.persistence.EntityManager;
import javax.persistence.EntityNotFoundException;
import javax.persistence.Persistence;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.storage.StorageException;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
final class DeletedUserEvictionTest {
  @ContextualEntityManager private EntityManager entityManager;
  private DeletedUserEviction deletedUserEviction;

  @Mock private Chronometry mockChronometry;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
    deletedUserEviction = new DeletedUserEviction(mockChronometry);
  }

  @Test
  @WithEntityManager
  void oldActiveUser_keeps() {
    Instant now = Instant.now();
    User user =
        new User()
            .setState(UserState.USER_ACTIVE)
            .setUsername("username")
            .setLastSession(Instant.ofEpochSecond(1));
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(2)));

    deletedUserEviction.run();

    assertTrue(isInStorage(user));
  }

  @Test
  @WithEntityManager
  void newDeletedUser_keeps() {
    User user =
        new User()
            .setState(UserState.USER_DELETED)
            .setUsername("username")
            .setLastSession(Instant.ofEpochSecond(3));
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(2)));

    deletedUserEviction.run();

    assertTrue(isInStorage(user));
  }

  @Test
  @WithEntityManager
  void oldDeletedUser_removes() {
    User user =
        new User()
            .setState(UserState.USER_DELETED)
            .setUsername("username")
            .setLastSession(Instant.ofEpochSecond(1));
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(2)));

    deletedUserEviction.run();

    assertFalse(isInStorage(user));
  }

  @WithEntityTransaction
  private void persistEntity(Object entity) {
    entityManager.persist(entity);
  }

  @WithEntityTransaction
  private void refreshEntity(Object entity) {
    entityManager.refresh(entity);
  }

  private boolean isInStorage(Object entity) {
    try {
      refreshEntity(entity);
      return true;
    } catch (StorageException exception) {
      if (exception.getCause() instanceof EntityNotFoundException) {
        return false;
      }
      throw exception;
    }
  }
}
