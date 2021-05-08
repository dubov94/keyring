package server.main;

import server.main.aspects.StorageManagerAspect;
import server.main.entities.Key;
import server.main.entities.Tag;
import server.main.entities.User;
import com.google.common.collect.ImmutableList;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

import javax.persistence.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EntitiesExpirationTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private EntityManager entityManager;
  private EntitiesExpiration entitiesExpiration;

  @Mock private Chronometry mockChronometry;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    entityManager = entityManagerFactory.createEntityManager();
    entitiesExpiration = new EntitiesExpiration(mockChronometry);
  }

  @Test
  void dropDeletedUsersAndTheirDependencies_activeUser_keepsEntities() {
    User user = new User().setState(User.State.ACTIVE).setUsername(createUniqueUsername());
    persistEntity(user);
    Tag tag = new Tag().setValue("tag");
    Key key = new Key().setUser(user).setValue("secret").setTags(ImmutableList.of(tag));
    persistEntity(key);

    entitiesExpiration.dropDeletedUsersAndTheirDependencies();

    assertTrue(isEntityInStorage(tag));
    assertTrue(isEntityInStorage(key));
    assertTrue(isEntityInStorage(user));
  }

  @Test
  void dropDeletedUsersAndTheirDependencies_deletedUser_removesEntities() {
    User user = new User().setState(User.State.DELETED).setUsername(createUniqueUsername());
    persistEntity(user);
    Tag tag = new Tag().setValue("tag");
    Key key = new Key().setUser(user).setValue("secret").setTags(ImmutableList.of(tag));
    persistEntity(key);

    entitiesExpiration.dropDeletedUsersAndTheirDependencies();

    assertFalse(isEntityInStorage(tag));
    assertFalse(isEntityInStorage(key));
    assertFalse(isEntityInStorage(user));
  }

  @Test
  void dropExpiredPendingUsers_getsOldActiveUser_keepsEntity() {
    User user = new User().setState(User.State.ACTIVE).setUsername(createUniqueUsername());
    persistEntity(user);
    when(mockChronometry.currentTime()).thenReturn(Instant.EPOCH);
    when(mockChronometry.subtract(Instant.EPOCH, 15, ChronoUnit.MINUTES)).thenReturn(Instant.now());

    entitiesExpiration.dropExpiredPendingUsers();

    assertTrue(isEntityInStorage(user));
  }

  @Test
  void dropExpiredPendingUsers_getsOldPendingUser_removesEntity() {
    User user = new User().setState(User.State.PENDING).setUsername(createUniqueUsername());
    persistEntity(user);
    when(mockChronometry.currentTime()).thenReturn(Instant.EPOCH);
    when(mockChronometry.subtract(Instant.EPOCH, 15, ChronoUnit.MINUTES)).thenReturn(Instant.now());

    entitiesExpiration.dropExpiredPendingUsers();

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
