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
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@ExtendWith(MockitoExtension.class)
@Testcontainers
final class DeletedUserEvictionTest {
  @Container
  private static final PostgreSQLContainer<?> postgresContainer =
      new PostgreSQLContainer<>(DockerImageName.parse("postgres"));

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
    User user = new User().setState(UserState.USER_ACTIVE).setUsername("username");
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.now()));

    deletedUserEviction.run();

    assertTrue(isEntityInStorage(user));
  }

  @Test
  @WithEntityManager
  void newDeletedUser_keeps() {
    User user = new User().setState(UserState.USER_DELETED).setUsername("username");
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.EPOCH));

    deletedUserEviction.run();

    assertTrue(isEntityInStorage(user));
  }

  @Test
  @WithEntityManager
  void oldDeletedUser_removes() {
    User user = new User().setState(UserState.USER_DELETED).setUsername("username");
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.DELETED_USER_STORAGE_EVICTION_D, ChronoUnit.DAYS))
        .thenReturn(Timestamp.from(Instant.now()));

    deletedUserEviction.run();

    assertFalse(isEntityInStorage(user));
  }

  @WithEntityTransaction
  private void persistEntity(Object entity) {
    entityManager.persist(entity);
  }

  @WithEntityTransaction
  private boolean isEntityInStorage(Object entity) {
    try {
      entityManager.refresh(entity);
      return true;
    } catch (EntityNotFoundException exception) {
      return false;
    }
  }
}
