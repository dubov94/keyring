package keyring.server.main.storage;

import static java.util.stream.Collectors.toList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import keyring.server.main.Arithmetic;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.User;
import keyring.server.main.proto.service.KeyAttrs;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
    accountOperationsClient = new AccountOperationsClient(new Chronometry(new Arithmetic()));
    keyOperationsClient = new KeyOperationsClient();
  }

  @Test
  @WithEntityManager
  void createKey() {
    long sessionId = createActiveSession(createUniqueUser());
    Password password =
        Password.newBuilder().setValue("password").addAllTags(ImmutableList.of("tag")).build();

    keyOperationsClient.createKey(sessionId, password, KeyAttrs.getDefaultInstance());

    List<Password> passwords =
        keyOperationsClient.readKeys(sessionId).stream().map(Key::toPassword).collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  @WithEntityManager
  void createKey_withParent() {
    long sessionId = createActiveSession(createUniqueUser());
    Password parent = Password.newBuilder().setValue("parent").build();
    long parentId =
        keyOperationsClient
            .createKey(sessionId, parent, KeyAttrs.getDefaultInstance())
            .getIdentifier();
    Password child = Password.newBuilder().setValue("child").build();

    long childId =
        keyOperationsClient
            .createKey(
                sessionId,
                child,
                KeyAttrs.newBuilder().setIsShadow(true).setParent(parentId).build())
            .getIdentifier();

    List<Key> keys = keyOperationsClient.readKeys(sessionId);
    assertEquals(2, keys.size());
    Optional<Key> maybeChildKey =
        keys.stream().filter(key -> Objects.equals(key.getIdentifier(), childId)).findAny();
    assertTrue(maybeChildKey.isPresent());
    Key childKey = maybeChildKey.get();
    assertTrue(childKey.getIsShadow());
    assertEquals(parentId, childKey.getParent().getIdentifier());
  }

  @Test
  @WithEntityManager
  void createKey_nonShadowWithParent_throws() {
    long sessionId = createActiveSession(createUniqueUser());

    assertThrows(
        StorageException.class,
        () ->
            keyOperationsClient.createKey(
                sessionId,
                Password.getDefaultInstance(),
                KeyAttrs.newBuilder().setParent(1).build()));
  }

  @Test
  @WithEntityManager
  void createKey_foreignParent_throws() {
    long sessionA = createActiveSession(createUniqueUser());
    long sessionB = createActiveSession(createUniqueUser());
    long foreignParentId =
        keyOperationsClient
            .createKey(sessionB, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getIdentifier();

    StorageException thrown =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionA,
                    Password.getDefaultInstance(),
                    KeyAttrs.newBuilder().setIsShadow(true).setParent(foreignParentId).build()));
    assertTrue(
        thrown
            .getMessage()
            .contains(String.format("Parent %d does not belong to", foreignParentId)));
  }

  @Test
  @WithEntityManager
  void createKey_shadowForShadow_throws() {
    long sessionId = createActiveSession(createUniqueUser());
    Password parent = Password.newBuilder().setValue("parent").build();
    long parentId =
        keyOperationsClient
            .createKey(sessionId, parent, KeyAttrs.newBuilder().setIsShadow(true).build())
            .getIdentifier();

    StorageException thrown =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionId,
                    Password.getDefaultInstance(),
                    KeyAttrs.newBuilder().setIsShadow(true).setParent(parentId).build()));

    assertTrue(
        thrown.getMessage().contains(String.format("for %d as it's also a shadow", parentId)));
  }

  @Test
  @WithEntityManager
  void createKey_invalidSession_throws() {
    User user = createUniqueUser();
    long sessionId = createNewSession(user.getIdentifier(), user.getVersion());

    StorageException thrown =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance()));

    assertTrue(
        thrown.getMessage().contains(String.format("`Session` %d is not `ACTIVATED`", sessionId)));
  }

  @Test
  @WithEntityManager
  void updateKey() {
    long sessionId = createActiveSession(createUniqueUser());
    long keyId =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.newBuilder().setValue("x").addAllTags(ImmutableList.of("a", "b")).build(),
                KeyAttrs.getDefaultInstance())
            .getIdentifier();
    Password password =
        Password.newBuilder().setValue("y").addAllTags(ImmutableList.of("c", "d")).build();

    keyOperationsClient.updateKey(
        sessionId, KeyPatch.newBuilder().setIdentifier(keyId).setPassword(password).build());

    List<Password> passwords =
        keyOperationsClient.readKeys(sessionId).stream().map(Key::toPassword).collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  @WithEntityManager
  void deleteKey() {
    long sessionId = createActiveSession(createUniqueUser());
    long keyId =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getIdentifier();
    assertEquals(1, keyOperationsClient.readKeys(sessionId).size());

    keyOperationsClient.deleteKey(sessionId, keyId);

    assertTrue(keyOperationsClient.readKeys(sessionId).isEmpty());
  }

  @Test
  @WithEntityManager
  void electShadow_createParent() {
    long sessionId = createActiveSession(createUniqueUser());
    Password password =
        Password.newBuilder().setValue("foo").addAllTags(ImmutableList.of("bar")).build();
    long shadowId =
        keyOperationsClient
            .createKey(sessionId, password, KeyAttrs.newBuilder().setIsShadow(true).build())
            .getIdentifier();

    Tuple2<Key, List<Key>> election = keyOperationsClient.electShadow(sessionId, shadowId);

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    Optional<Key> maybeParent = getKeyFromList(allKeys, election._1.getIdentifier());
    assertTrue(maybeParent.isPresent());
    assertEquals(password, maybeParent.get().toPassword());
    assertFalse(getKeyFromList(allKeys, shadowId).isPresent());
    assertEquals(1, election._2.size());
    assertEquals(shadowId, election._2.get(0).getIdentifier());
  }

  @Test
  @WithEntityManager
  void electShadow_updateParent() {
    long sessionId = createActiveSession(createUniqueUser());
    long parentId =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getIdentifier();
    Password update =
        Password.newBuilder().setValue("foo").addAllTags(ImmutableList.of("bar")).build();
    long shadowId =
        keyOperationsClient
            .createKey(
                sessionId,
                update,
                KeyAttrs.newBuilder().setIsShadow(true).setParent(parentId).build())
            .getIdentifier();

    Tuple2<Key, List<Key>> election = keyOperationsClient.electShadow(sessionId, shadowId);

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    Optional<Key> maybeParent = getKeyFromList(allKeys, parentId);
    assertTrue(maybeParent.isPresent());
    assertEquals(update, maybeParent.get().toPassword());
    assertFalse(getKeyFromList(allKeys, shadowId).isPresent());
    assertEquals(1, election._2.size());
    assertEquals(shadowId, election._2.get(0).getIdentifier());
  }

  @Test
  @WithEntityManager
  void electShadow_nonShadow_deletesDependants() {
    long sessionId = createActiveSession(createUniqueUser());
    long parentId =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getIdentifier();
    long fstShadowId =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.getDefaultInstance(),
                KeyAttrs.newBuilder().setIsShadow(true).setParent(parentId).build())
            .getIdentifier();
    long sndShadowId =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.getDefaultInstance(),
                KeyAttrs.newBuilder().setIsShadow(true).setParent(parentId).build())
            .getIdentifier();

    Tuple2<Key, List<Key>> election = keyOperationsClient.electShadow(sessionId, parentId);

    assertEquals(2, election._2.size());
    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    assertFalse(getKeyFromList(allKeys, fstShadowId).isPresent());
    assertFalse(getKeyFromList(allKeys, sndShadowId).isPresent());
  }

  private Optional<Key> getKeyFromList(List<Key> allKeys, long keyId) {
    return allKeys.stream().filter(key -> Objects.equals(key.getIdentifier(), keyId)).findAny();
  }

  private String newRandomUuid() {
    return UUID.randomUUID().toString();
  }

  private User createUniqueUser() {
    return accountOperationsClient.createUser(newRandomUuid(), "", "", "", "")._1;
  }

  private long createNewSession(long userId, long userVersion) {
    return accountOperationsClient
        .createSession(userId, userVersion, "127.0.0.1", "Chrome/0.0.0", "version")
        .getIdentifier();
  }

  private long createActiveSession(User user) {
    long userId = user.getIdentifier();
    long sessionId = createNewSession(userId, user.getVersion());
    accountOperationsClient.initiateSession(
        userId, sessionId, String.format("authn:%s", newRandomUuid()));
    accountOperationsClient.activateSession(
        userId, sessionId, String.format("session:%s", newRandomUuid()));
    return sessionId;
  }
}
