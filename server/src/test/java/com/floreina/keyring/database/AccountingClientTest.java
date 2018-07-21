package com.floreina.keyring.database;

import com.floreina.keyring.aspects.DatabaseManagerAspect;
import com.floreina.keyring.entities.Activation;
import com.floreina.keyring.entities.User;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.persistence.Persistence;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AccountingClientTest {
  private AccountingClient accountingClient;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(DatabaseManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("development"));
  }

  @BeforeEach
  void beforeEach() {
    accountingClient = new AccountingClient();
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

  private String createUniqueName() {
    return UUID.randomUUID().toString();
  }
}
