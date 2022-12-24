package keyring.server.janitor.tasks;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.common.collect.ImmutableList;
import java.util.UUID;
import javax.persistence.*;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

final class DeletedUsersTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private EntityManager entityManager;
  private DeletedUsers deletedUsers;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    entityManager = entityManagerFactory.createEntityManager();
    deletedUsers = new DeletedUsers();
  }

  @Test
  void activeUser_keeps() {
    User user = new User().setState(UserState.ACTIVE).setUsername(newRandomUuid());
    persistEntity(user);
    Key key = new Key().setUser(user).setValue("secret").setTags(ImmutableList.of("tag"));
    persistEntity(key);

    deletedUsers.run();

    assertTrue(isEntityInStorage(key));
    assertTrue(isEntityInStorage(user));
  }

  @Test
  void deletedUser_removes() {
    User user = new User().setState(UserState.DELETED).setUsername(newRandomUuid());
    persistEntity(user);
    Key key = new Key().setUser(user).setValue("secret").setTags(ImmutableList.of("tag"));
    persistEntity(key);

    deletedUsers.run();

    assertFalse(isEntityInStorage(key));
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
