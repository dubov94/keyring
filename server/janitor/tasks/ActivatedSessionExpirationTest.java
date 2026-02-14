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
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.SessionStage;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
final class ActivatedSessionExpirationTest {
  @ContextualEntityManager private EntityManager entityManager;
  private ActivatedSessionExpiration activatedSessionExpiration;

  @Mock private Chronometry mockChronometry;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
    activatedSessionExpiration = new ActivatedSessionExpiration(mockChronometry);
    when(mockChronometry.currentTime()).thenReturn(Instant.now());
  }

  @Test
  @WithEntityManager
  void relevantActivated_keeps() {
    when(mockChronometry.pastTimestamp(Session.SESSION_AUTHN_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));
    when(mockChronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(1)));
    User user = new User().setUsername("username");
    persistEntity(user);
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.SESSION_ACTIVATED, Instant.ofEpochSecond(2));
    persistEntity(session);

    activatedSessionExpiration.run();

    refreshEntity(session);
    assertEquals(SessionStage.SESSION_ACTIVATED, session.getStage());
  }

  @Test
  @WithEntityManager
  void expiredActivated_disables() {
    when(mockChronometry.pastTimestamp(Session.SESSION_AUTHN_EXPIRATION_M, ChronoUnit.MINUTES))
        .thenReturn(Timestamp.from(Instant.now()));
    when(mockChronometry.pastTimestamp(Session.SESSION_ABSOLUTE_DURATION_H, ChronoUnit.HOURS))
        .thenReturn(Timestamp.from(Instant.ofEpochSecond(2)));
    User user = new User().setUsername("username");
    persistEntity(user);
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.SESSION_ACTIVATED, Instant.ofEpochSecond(1));
    persistEntity(session);

    activatedSessionExpiration.run();

    refreshEntity(session);
    assertEquals(SessionStage.SESSION_DISABLED, session.getStage());
  }

  @WithEntityTransaction
  private void persistEntity(Object entity) {
    entityManager.persist(entity);
  }

  @WithEntityTransaction
  private void refreshEntity(Object entity) {
    entityManager.refresh(entity);
  }
}
