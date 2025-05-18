package keyring.server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.persistence.EntityManager;
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
final class PendingUserExpirationTest {
  @Container
  private static final PostgreSQLContainer<?> postgresContainer =
      new PostgreSQLContainer<>(DockerImageName.parse("postgres"));

  @ContextualEntityManager private EntityManager entityManager;
  private PendingUserExpiration pendingUserExpiration;

  @Mock private Chronometry mockChronometry;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
    pendingUserExpiration = new PendingUserExpiration(mockChronometry);
  }

  @Test
  @WithEntityManager
  void oldActiveUser_keeps() {
    User user = new User().setState(UserState.USER_ACTIVE).setUsername("username");
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));

    pendingUserExpiration.run();

    entityManager.refresh(user);
    assertEquals(UserState.USER_ACTIVE, user.getState());
  }

  @Test
  @WithEntityManager
  void newPendingUser_keeps() {
    User user = new User().setState(UserState.USER_PENDING).setUsername("username");
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.EPOCH));

    pendingUserExpiration.run();

    entityManager.refresh(user);
    assertEquals(UserState.USER_PENDING, user.getState());
  }

  @Test
  @WithEntityManager
  void oldPendingUser_deletes() {
    User user = new User().setState(UserState.USER_PENDING).setUsername("username");
    persistEntity(user);
    when(mockChronometry.pastTimestamp(User.PENDING_USER_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));

    pendingUserExpiration.run();

    entityManager.refresh(user);
    assertEquals(UserState.USER_DELETED, user.getState());
  }

  @WithEntityTransaction
  private void persistEntity(Object entity) {
    entityManager.persist(entity);
  }
}
