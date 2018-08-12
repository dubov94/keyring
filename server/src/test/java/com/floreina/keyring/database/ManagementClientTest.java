package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.Password;
import com.floreina.keyring.aspects.DatabaseManagerAspect;
import com.floreina.keyring.entities.Utilities;
import com.google.common.collect.ImmutableList;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import java.util.List;
import java.util.Random;
import java.util.UUID;

import static java.util.stream.Collectors.toList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ManagementClientTest {
  private static final EntityManagerFactory entityManagerFactory =
      Persistence.createEntityManagerFactory("testing");
  private static Random random = new Random();
  private ManagementClient managementClient;

  @BeforeAll
  static void beforeAll() throws ClassNotFoundException {
    Aspects.aspectOf(DatabaseManagerAspect.class).initialize(entityManagerFactory);
  }

  @BeforeEach
  void beforeEach() {
    managementClient = new ManagementClient();
  }

  @Test
  void createKey() {
    long userIdentifier = createUniqueUser();
    Password password =
        Password.newBuilder().setValue("password").addAllTags(ImmutableList.of("tag")).build();

    managementClient.createKey(userIdentifier, password);

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
  void updateKey() {
    long userIdentifier = createUniqueUser();
    long keyIdentifier =
        managementClient
            .createKey(
                userIdentifier,
                Password.newBuilder().setValue("x").addAllTags(ImmutableList.of("a", "b")).build())
            .getIdentifier();
    Password password =
        Password.newBuilder().setValue("y").addAllTags(ImmutableList.of("c", "d")).build();

    managementClient.updateKey(
        userIdentifier,
        IdentifiedKey.newBuilder().setIdentifier(keyIdentifier).setPassword(password).build());

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
  void deleteKey() {
    long userIdentifier = createUniqueUser();
    long keyIdentifier =
        managementClient.createKey(userIdentifier, Password.getDefaultInstance()).getIdentifier();
    assertEquals(1, managementClient.readKeys(userIdentifier).size());

    managementClient.deleteKey(userIdentifier, keyIdentifier);

    assertTrue(managementClient.readKeys(userIdentifier).isEmpty());
  }

  private long createUniqueUser() {
    AccountingClient accountingClient = new AccountingClient();
    long identifier =
        accountingClient
            .createUserWithActivation(UUID.randomUUID().toString(), "", "", "", "")
            .getIdentifier();
    accountingClient.activateUser(identifier);
    return identifier;
  }
}
