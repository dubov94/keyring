package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.aspects.DatabaseManagerAspect;
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
  void createUser_getsUniqueUsername_postsUserAndMailToken() {
    String username = createUniqueName();
    long userIdentifier =
        accountingClient
            .createUser(username, "salt", "digest", "mail@example.com", "0")
            .getIdentifier();

    MailToken mailToken = accountingClient.getMailToken(userIdentifier, "0").get();
    assertEquals("0", mailToken.getCode());
    assertEquals("mail@example.com", mailToken.getMail());
    User user = mailToken.getUser();
    assertEquals(username, user.getUsername());
    assertEquals("salt", user.getSalt());
    assertEquals("digest", user.getDigest());
    assertNull(user.getMail());
  }

  @Test
  void createUser_getsExistingUsername_throwsException() {
    String username = createUniqueName();
    accountingClient.createUser(username, "", "", "", "0");

    assertThrows(
        DatabaseException.class, () -> accountingClient.createUser(username, "", "", "", "X"));
  }

  @Test
  void getMailToken_DoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountingClient.getMailToken(Long.MAX_VALUE, ""));
  }

  @Test
  void releaseMailToken_removesTokenSetsMail() {
    String username = createUniqueName();
    long userIdentifier =
        accountingClient.createUser(username, "", "", "mail@domain.com", "0").getIdentifier();
    MailToken mailToken = accountingClient.getMailToken(userIdentifier, "0").get();

    accountingClient.releaseMailToken(mailToken.getIdentifier());

    assertEquals(Optional.empty(), accountingClient.getMailToken(userIdentifier, "0"));
    assertEquals(
        "mail@domain.com", accountingClient.getUserByIdentifier(userIdentifier).get().getMail());
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
    long userIdentifier = accountingClient.createUser(username, "", "", "", "").getIdentifier();
    MailToken mailToken = accountingClient.getMailToken(userIdentifier, "").get();
    accountingClient.releaseMailToken(mailToken.getIdentifier());
    return userIdentifier;
  }

  private String createUniqueName() {
    return UUID.randomUUID().toString();
  }
}
