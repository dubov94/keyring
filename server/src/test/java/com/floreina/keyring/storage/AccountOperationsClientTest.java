package com.floreina.keyring.storage;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.aspects.StorageManagerAspect;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.entities.Utilities;
import com.google.common.collect.ImmutableList;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.persistence.Persistence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static java.util.stream.Collectors.toList;
import static org.junit.jupiter.api.Assertions.*;

class AccountOperationsClientTest {
  private AccountOperationsClient accountOperationsClient;
  private KeyOperationsClient keyOperationsClient;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
  }

  @BeforeEach
  void beforeEach() {
    accountOperationsClient = new AccountOperationsClient();
    keyOperationsClient = new KeyOperationsClient();
  }

  @Test
  void createUser_getsUniqueUsername_postsUserAndMailToken() {
    String username = createUniqueName();
    long userIdentifier =
        accountOperationsClient
            .createUser(username, "salt", "hash", "mail@example.com", "0")
            .getIdentifier();

    MailToken mailToken = accountOperationsClient.getMailToken(userIdentifier, "0").get();
    assertEquals("0", mailToken.getCode());
    assertEquals("mail@example.com", mailToken.getMail());
    User user = mailToken.getUser();
    assertEquals(User.State.PENDING, user.getState());
    assertEquals(username, user.getUsername());
    assertEquals("salt", user.getSalt());
    assertEquals("hash", user.getHash());
    assertNull(user.getMail());
  }

  @Test
  void createUser_getsExistingUsername_throwsException() {
    String username = createUniqueName();
    accountOperationsClient.createUser(username, "", "", "", "0");

    assertThrows(
        StorageException.class,
        () -> accountOperationsClient.createUser(username, "", "", "", "X"));
  }

  @Test
  void getMailToken_DoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountOperationsClient.getMailToken(Long.MAX_VALUE, ""));
  }

  @Test
  void releaseMailToken_removesTokenSetsMailActivatesUser() {
    String username = createUniqueName();
    long userIdentifier =
        accountOperationsClient
            .createUser(username, "", "", "mail@domain.com", "0")
            .getIdentifier();
    MailToken mailToken = accountOperationsClient.getMailToken(userIdentifier, "0").get();

    accountOperationsClient.releaseMailToken(mailToken.getIdentifier());

    assertEquals(Optional.empty(), accountOperationsClient.getMailToken(userIdentifier, "0"));
    User user = accountOperationsClient.getUserByIdentifier(userIdentifier).get();
    assertEquals("mail@domain.com", user.getMail());
    assertEquals(User.State.ACTIVE, user.getState());
  }

  @Test
  void getUserByName_userDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountOperationsClient.getUserByName(""));
  }

  @Test
  void getUserByIdentifier_userDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountOperationsClient.getUserByIdentifier(Long.MAX_VALUE));
  }

  @Test
  void changeMasterKey_updatesSaltHashAndKeys() {
    long userIdentifier = createActiveUser();
    long keyIdentifier =
        keyOperationsClient
            .createKey(userIdentifier, Password.newBuilder().setValue("").addTags("").build())
            .getIdentifier();

    Password password = Password.newBuilder().setValue("value").addTags("tag").build();
    accountOperationsClient.changeMasterKey(
        userIdentifier,
        "salt",
        "hash",
        ImmutableList.of(
            IdentifiedKey.newBuilder().setIdentifier(keyIdentifier).setPassword(password).build()));

    User user = accountOperationsClient.getUserByIdentifier(userIdentifier).get();
    assertEquals("salt", user.getSalt());
    assertEquals("hash", user.getHash());
    List<Password> passwords =
        keyOperationsClient
            .readKeys(userIdentifier)
            .stream()
            .map(Utilities::keyToPassword)
            .collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  void changeMasterKey_lacksKeyUpdates_throwsException() {
    long userIdentifier = createActiveUser();
    keyOperationsClient.createKey(userIdentifier, Password.getDefaultInstance());

    assertThrows(
        StorageException.class,
        () -> accountOperationsClient.changeMasterKey(userIdentifier, "", "", ImmutableList.of()));
  }

  @Test
  void createSession_putsSession() {
    long userIdentifier = createActiveUser();

    accountOperationsClient.createSession(userIdentifier, "key", "127.0.0.1", "Chrome/0.0.0");

    List<Session> list = accountOperationsClient.readSessions(userIdentifier);
    assertEquals(1, list.size());
    Session session = list.get(0);
    assertEquals("key", session.getKey());
    assertEquals("127.0.0.1", session.getIpAddress());
    assertEquals("Chrome/0.0.0", session.getUserAgent());
  }

  @Test
  void createMailToken_putsMailToken() {
    long userIdentifier = createActiveUser();

    accountOperationsClient.createMailToken(userIdentifier, "user@mail.com", "0");

    Optional<MailToken> maybeMailToken = accountOperationsClient.getMailToken(userIdentifier, "0");
    assertTrue(maybeMailToken.isPresent());
    MailToken mailToken = maybeMailToken.get();
    assertEquals("user@mail.com", mailToken.getMail());
    assertEquals("0", mailToken.getCode());
  }

  @Test
  void changeUsername_getsExistingUsername_throwsException() {
    long userIdentifier = createActiveUser();
    String username = createUniqueName();
    accountOperationsClient.createUser(username, "", "", "", "");

    assertThrows(
        StorageException.class,
        () -> accountOperationsClient.changeUsername(userIdentifier, username));
  }

  @Test
  void changeUsername_getsUniqueUsername_updatesUsername() {
    long userIdentifier = createActiveUser();

    accountOperationsClient.changeUsername(userIdentifier, "username");

    Optional<User> maybeUser = accountOperationsClient.getUserByIdentifier(userIdentifier);
    assertTrue(maybeUser.isPresent());
    User user = maybeUser.get();
    assertEquals("username", user.getUsername());
  }

  @Test
  void markAccountAsDeleted_updatesState() {
    long userIdentifier = createActiveUser();

    accountOperationsClient.markAccountAsDeleted(userIdentifier);

    Optional<User> maybeUser = accountOperationsClient.getUserByIdentifier(userIdentifier);
    assertTrue(maybeUser.isPresent());
    User user = maybeUser.get();
    assertEquals(User.State.DELETED, user.getState());
  }

  private long createActiveUser() {
    String username = createUniqueName();
    long userIdentifier =
        accountOperationsClient.createUser(username, "", "", "", "").getIdentifier();
    MailToken mailToken = accountOperationsClient.getMailToken(userIdentifier, "").get();
    accountOperationsClient.releaseMailToken(mailToken.getIdentifier());
    return userIdentifier;
  }

  private String createUniqueName() {
    return UUID.randomUUID().toString();
  }
}
