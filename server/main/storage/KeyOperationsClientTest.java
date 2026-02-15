package keyring.server.main.storage;

import static java.util.stream.Collectors.toList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple2;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class KeyOperationsClientTest {
  private static Random random = new Random();
  private AccountOperationsClient accountOperationsClient;
  private KeyOperationsClient keyOperationsClient;
  private Instant now = Instant.EPOCH;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
    Limiters limiters =
        new Limiters(
            /* approxMaxKeysPerUser */ 8,
            /* approxMaxMailTokensPerUser */ 4,
            /* approxMaxMailTokensPerAddress */ 2,
            /* approxMaxRecentSessionsPerUser */ 15,
            /* approxMaxOtpParamsPerUser */ 4);
    accountOperationsClient =
        new AccountOperationsClient(
            new Chronometry(new Arithmetic(), () -> now), limiters, /* initialSpareAttempts */ 5);
    keyOperationsClient = new KeyOperationsClient(limiters);
  }

  @Test
  @WithEntityManager
  void importKeys() {
    long sessionId = createActiveSession(createUniqueUser());
    ImmutableList<Password> passwords =
        ImmutableList.of(
            Password.newBuilder().setValue("alpha").build(),
            Password.newBuilder().setValue("beta").build());

    keyOperationsClient.importKeys(sessionId, passwords);

    List<Password> imported =
        keyOperationsClient.readKeys(sessionId).stream().map(Key::toPassword).collect(toList());
    assertEquals(passwords, imported);
  }

  @Test
  @WithEntityManager
  void createKey() {
    long sessionId = createActiveSession(createUniqueUser());
    Password password =
        Password.newBuilder().setValue("password").addAllTags(ImmutableList.of("tag")).build();

    keyOperationsClient.createKey(sessionId, password, KeyAttrs.getDefaultInstance());

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    assertEquals(1, allKeys.size());
    assertEquals(password, allKeys.get(0).toPassword());
  }

  @Test
  @WithEntityManager
  void createKey_withParent() {
    long sessionId = createActiveSession(createUniqueUser());
    Password parent = Password.newBuilder().setValue("parent").build();
    UUID parentUuid =
        keyOperationsClient.createKey(sessionId, parent, KeyAttrs.getDefaultInstance()).getUuid();
    Password child = Password.newBuilder().setValue("child").build();

    long childId =
        keyOperationsClient
            .createKey(
                sessionId,
                child,
                KeyAttrs.newBuilder()
                    .setIsShadow(true)
                    .setParentUid(String.valueOf(parentUuid))
                    .build())
            .getIdentifier();

    List<Key> keys = keyOperationsClient.readKeys(sessionId);
    assertEquals(2, keys.size());
    Optional<Key> maybeChildKey =
        keys.stream().filter(key -> Objects.equals(key.getIdentifier(), childId)).findAny();
    assertTrue(maybeChildKey.isPresent());
    Key childKey = maybeChildKey.get();
    assertTrue(childKey.getIsShadow());
    assertEquals(parentUuid, childKey.getParent().getUuid());
  }

  @Test
  @WithEntityManager
  void createKey_nonShadowWithParent_throws() {
    long sessionId = createActiveSession(createUniqueUser());

    StorageException exception =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionId,
                    Password.getDefaultInstance(),
                    KeyAttrs.newBuilder().setParentUid(String.valueOf(UUID.randomUUID())).build()));

    assertEquals(
        "java.lang.IllegalArgumentException: Shadows must have a non-nil parent",
        exception.getMessage());
  }

  @Test
  @WithEntityManager
  void createKey_foreignParent_throws() {
    long sessionA = createActiveSession(createUniqueUser());
    long sessionB = createActiveSession(createUniqueUser());
    UUID foreignParentUuid =
        keyOperationsClient
            .createKey(sessionB, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getUuid();

    StorageException exception =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionA,
                    Password.getDefaultInstance(),
                    KeyAttrs.newBuilder()
                        .setIsShadow(true)
                        .setParentUid(String.valueOf(foreignParentUuid))
                        .build()));
    assertEquals(
        String.format(
            "java.lang.IllegalArgumentException: Parent %s does not belong to the user",
            foreignParentUuid),
        exception.getMessage());
  }

  @Test
  @WithEntityManager
  void createKey_shadowForShadow_throws() {
    long sessionId = createActiveSession(createUniqueUser());
    Password parent = Password.newBuilder().setValue("parent").build();
    UUID parentUuid =
        keyOperationsClient
            .createKey(sessionId, parent, KeyAttrs.newBuilder().setIsShadow(true).build())
            .getUuid();

    StorageException exception =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionId,
                    Password.getDefaultInstance(),
                    KeyAttrs.newBuilder()
                        .setIsShadow(true)
                        .setParentUid(String.valueOf(parentUuid))
                        .build()));

    assertEquals(
        String.format(
            "java.lang.IllegalArgumentException:"
                + " Cannot create a shadow for %s as it's also a shadow",
            parentUuid),
        exception.getMessage());
  }

  @Test
  @WithEntityManager
  void createKey_invalidSession_throws() {
    User user = createUniqueUser();
    long sessionId = createNewSession(user.getIdentifier(), user.getVersion(), "127.0.0.1");

    StorageException exception =
        assertThrows(
            StorageException.class,
            () ->
                keyOperationsClient.createKey(
                    sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance()));

    assertEquals(
        String.format(
            "java.lang.IllegalArgumentException: `Session` %d is not `ACTIVATED`", sessionId),
        exception.getMessage());
  }

  @Test
  @WithEntityManager
  void updateKey() {
    long sessionId = createActiveSession(createUniqueUser());
    UUID keyUuid =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.newBuilder().setValue("x").addAllTags(ImmutableList.of("a", "b")).build(),
                KeyAttrs.getDefaultInstance())
            .getUuid();
    Password password =
        Password.newBuilder().setValue("y").addAllTags(ImmutableList.of("c", "d")).build();

    keyOperationsClient.updateKey(
        sessionId,
        KeyPatch.newBuilder().setUid(String.valueOf(keyUuid)).setPassword(password).build());

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    Optional<Key> maybeKey = getKeyFromList(allKeys, keyUuid);
    assertTrue(maybeKey.isPresent());
    assertEquals(password, maybeKey.get().toPassword());
  }

  @Test
  @WithEntityManager
  void deleteKey() {
    long sessionId = createActiveSession(createUniqueUser());
    UUID keyUuid =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getUuid();
    assertEquals(1, keyOperationsClient.readKeys(sessionId).size());

    keyOperationsClient.deleteKey(sessionId, keyUuid);

    assertTrue(keyOperationsClient.readKeys(sessionId).isEmpty());
  }

  @Test
  @WithEntityManager
  void electShadow_createParent() {
    long sessionId = createActiveSession(createUniqueUser());
    Password password =
        Password.newBuilder().setValue("foo").addAllTags(ImmutableList.of("bar")).build();
    UUID shadowUuid =
        keyOperationsClient
            .createKey(sessionId, password, KeyAttrs.newBuilder().setIsShadow(true).build())
            .getUuid();

    Tuple2<Key, List<Key>> election = keyOperationsClient.electShadow(sessionId, shadowUuid);

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    Optional<Key> maybeParent = getKeyFromList(allKeys, election._1.getUuid());
    assertTrue(maybeParent.isPresent());
    assertEquals(password, maybeParent.get().toPassword());
    assertFalse(getKeyFromList(allKeys, shadowUuid).isPresent());
    assertEquals(1, election._2.size());
    assertEquals(shadowUuid, election._2.get(0).getUuid());
  }

  @Test
  @WithEntityManager
  void electShadow_updateParent() {
    long sessionId = createActiveSession(createUniqueUser());
    UUID parentUuid =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getUuid();
    Password update =
        Password.newBuilder().setValue("foo").addAllTags(ImmutableList.of("bar")).build();
    UUID shadowUuid =
        keyOperationsClient
            .createKey(
                sessionId,
                update,
                KeyAttrs.newBuilder()
                    .setIsShadow(true)
                    .setParentUid(String.valueOf(parentUuid))
                    .build())
            .getUuid();

    Tuple2<Key, List<Key>> election = keyOperationsClient.electShadow(sessionId, shadowUuid);

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    Optional<Key> maybeParent = getKeyFromList(allKeys, parentUuid);
    assertTrue(maybeParent.isPresent());
    assertEquals(update, maybeParent.get().toPassword());
    assertFalse(getKeyFromList(allKeys, shadowUuid).isPresent());
    assertEquals(1, election._2.size());
    assertEquals(shadowUuid, election._2.get(0).getUuid());
  }

  @Test
  @WithEntityManager
  void electShadow_nonShadow_deletesDependants() {
    long sessionId = createActiveSession(createUniqueUser());
    UUID parentUuid =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getUuid();
    UUID fstShadowUuid =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.getDefaultInstance(),
                KeyAttrs.newBuilder()
                    .setIsShadow(true)
                    .setParentUid(String.valueOf(parentUuid))
                    .build())
            .getUuid();
    UUID sndShadowUuid =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.getDefaultInstance(),
                KeyAttrs.newBuilder()
                    .setIsShadow(true)
                    .setParentUid(String.valueOf(parentUuid))
                    .build())
            .getUuid();

    Tuple2<Key, List<Key>> election = keyOperationsClient.electShadow(sessionId, parentUuid);

    assertEquals(2, election._2.size());
    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    assertFalse(getKeyFromList(allKeys, fstShadowUuid).isPresent());
    assertFalse(getKeyFromList(allKeys, sndShadowUuid).isPresent());
  }

  @Test
  @WithEntityManager
  void togglePin() {
    long sessionId = createActiveSession(createUniqueUser());
    UUID keyUuid =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getUuid();

    keyOperationsClient.togglePin(sessionId, keyUuid, /* isPinned */ true);

    List<Key> allKeys = keyOperationsClient.readKeys(sessionId);
    Optional<Key> maybeKey = getKeyFromList(allKeys, keyUuid);
    assertTrue(maybeKey.isPresent());
    assertTrue(maybeKey.get().getIsPinned());
  }

  private Optional<Key> getKeyFromList(List<Key> allKeys, UUID keyUuid) {
    return allKeys.stream().filter(key -> Objects.equals(key.getUuid(), keyUuid)).findAny();
  }

  private String newRandomUuid() {
    return UUID.randomUUID().toString();
  }

  private User createUniqueUser() {
    return accountOperationsClient.createUser(newRandomUuid(), "", "", "127.0.0.1", "", "")._1;
  }

  private long createNewSession(long userId, long userVersion, String ipAddress) {
    return accountOperationsClient
        .createSession(userId, userVersion, ipAddress, "Chrome/0.0.0", "version")
        .getIdentifier();
  }

  private long createActiveSession(User user) {
    long userId = user.getIdentifier();
    long sessionId = createNewSession(userId, user.getVersion(), "127.0.0.1");
    accountOperationsClient.initiateSession(
        userId, sessionId, String.format("authn:%s", newRandomUuid()));
    accountOperationsClient.activateSession(
        userId, sessionId, String.format("session:%s", newRandomUuid()));
    return sessionId;
  }
}
