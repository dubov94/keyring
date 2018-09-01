package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.aspects.DatabaseManagerAspect;
import com.floreina.keyring.entities.Activation;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AccountingClientTest {
  private AccountingClient accountingClient;
  private ManagementClient managementClient;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(DatabaseManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
  }

  @BeforeEach
  void beforeEach() {
    accountingClient = new AccountingClient();
    managementClient = new ManagementClient();
  }

  @Test
  void createUserWithActivation_getsUniqueUsername_putsActivationWithUser() {
    String username = createUniqueName();
    long identifier =
        accountingClient
            .createUserWithActivation(username, "salt", "digest", "mail@example.com", "0")
            .getIdentifier();

    Activation activation = accountingClient.getActivationByUser(identifier).get();
    assertEquals("0", activation.getCode());
    User user = activation.getUser();
    assertEquals(User.State.PENDING, user.getState());
    assertEquals(username, user.getUsername());
    assertEquals("salt", user.getSalt());
    assertEquals("digest", user.getDigest());
    assertEquals("mail@example.com", user.getMail());
  }

  @Test
  void createUserWithActivation_getsExistingUsername_throwsException() {
    String username = createUniqueName();
    accountingClient.createUserWithActivation(username, "", "", "", "");

    assertThrows(
        DatabaseException.class,
        () -> accountingClient.createUserWithActivation(username, "", "", "", ""));
  }

  @Test
  void getActivationByUser_activationDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountingClient.getActivationByUser(Long.MAX_VALUE));
  }

  @Test
  void activateUser_removesActivationMakesUserActive() {
    String username = createUniqueName();
    User user = accountingClient.createUserWithActivation(username, "", "", "", "");
    assertEquals(User.State.PENDING, accountingClient.getUserByName(username).get().getState());
    long identifier = user.getIdentifier();

    accountingClient.activateUser(identifier);

    assertEquals(Optional.empty(), accountingClient.getActivationByUser(identifier));
    assertEquals(User.State.ACTIVE, accountingClient.getUserByName(username).get().getState());
  }

  @Test
  void getUserByName_userDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountingClient.getUserByName(""));
  }

  @Test
  void getUserByIdentifier_userDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountingClient.getUserByIdentifier(Long.MAX_VALUE));
  }

  @Test
  void changeMasterKey_updatesSaltDigestAndKeys() {
    long userIdentifier = createActiveUser();
    long keyIdentifier =
        managementClient
            .createKey(userIdentifier, Password.newBuilder().setValue("").addTags("").build())
            .getIdentifier();

    Password password = Password.newBuilder().setValue("value").addTags("tag").build();
    accountingClient.changeMasterKey(
        userIdentifier,
        "salt",
        "digest",
        ImmutableList.of(
            IdentifiedKey.newBuilder().setIdentifier(keyIdentifier).setPassword(password).build()));

    User user = accountingClient.getUserByIdentifier(userIdentifier).get();
    assertEquals("salt", user.getSalt());
    assertEquals("digest", user.getDigest());
    List<Password> passwords =
        managementClient
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
    managementClient.createKey(userIdentifier, Password.getDefaultInstance());

    assertThrows(
        DatabaseException.class,
        () -> accountingClient.changeMasterKey(userIdentifier, "", "", ImmutableList.of()));
  }

  @Test
  void createSession_putsSession() {
    long userIdentifier = createActiveUser();

    accountingClient.createSession(userIdentifier, "key", "127.0.0.1", "Chrome/0.0.0");

    List<Session> list = accountingClient.readSessions(userIdentifier);
    assertEquals(1, list.size());
    Session session = list.get(0);
    assertEquals("key", session.getKey());
    assertEquals("127.0.0.1", session.getIpAddress());
    assertEquals("Chrome/0.0.0", session.getUserAgent());
  }

  private long createActiveUser() {
    String username = createUniqueName();
    long userIdentifier =
        accountingClient.createUserWithActivation(username, "", "", "", "").getIdentifier();
    accountingClient.activateUser(userIdentifier);
    return userIdentifier;
  }

  private String createUniqueName() {
    return UUID.randomUUID().toString();
  }
}
