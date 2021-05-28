package server.main.storage;

import static java.util.stream.Collectors.toList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.common.collect.ImmutableList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import server.main.Chronometry;
import server.main.aspects.StorageManagerAspect;
import server.main.entities.Key;
import server.main.proto.service.IdentifiedKey;
import server.main.proto.service.Password;

class KeyOperationsClientTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private static Random random = new Random();
  private AccountOperationsClient accountOperationsClient;
  private KeyOperationsClient keyOperationsClient;

  @BeforeAll
  static void beforeAll() throws ClassNotFoundException {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    accountOperationsClient = new AccountOperationsClient(new Chronometry());
    keyOperationsClient = new KeyOperationsClient();
  }

  @Test
  void createKey() {
    long userIdentifier = createUniqueUser();
    Password password =
        Password.newBuilder().setValue("password").addAllTags(ImmutableList.of("tag")).build();

    keyOperationsClient.createKey(userIdentifier, password);

    List<Password> passwords =
        keyOperationsClient.readKeys(userIdentifier).stream()
            .map(Key::toPassword)
            .collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  void updateKey() {
    long userIdentifier = createUniqueUser();
    long keyIdentifier =
        keyOperationsClient
            .createKey(
                userIdentifier,
                Password.newBuilder().setValue("x").addAllTags(ImmutableList.of("a", "b")).build())
            .getIdentifier();
    Password password =
        Password.newBuilder().setValue("y").addAllTags(ImmutableList.of("c", "d")).build();

    keyOperationsClient.updateKey(
        userIdentifier,
        IdentifiedKey.newBuilder().setIdentifier(keyIdentifier).setPassword(password).build());

    List<Password> passwords =
        keyOperationsClient.readKeys(userIdentifier).stream()
            .map(Key::toPassword)
            .collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  void deleteKey() {
    long userIdentifier = createUniqueUser();
    long keyIdentifier =
        keyOperationsClient
            .createKey(userIdentifier, Password.getDefaultInstance())
            .getIdentifier();
    assertEquals(1, keyOperationsClient.readKeys(userIdentifier).size());

    keyOperationsClient.deleteKey(userIdentifier, keyIdentifier);

    assertTrue(keyOperationsClient.readKeys(userIdentifier).isEmpty());
  }

  private long createUniqueUser() {
    return accountOperationsClient
        .createUser(UUID.randomUUID().toString(), "", "", "", "")
        .getIdentifier();
  }
}
