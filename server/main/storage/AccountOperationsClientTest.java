package server.main.storage;

import static java.util.stream.Collectors.toList;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static server.main.storage.AccountOperationsInterface.NudgeStatus;

import com.google.common.collect.ImmutableList;
import io.vavr.Tuple2;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.persistence.Persistence;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import server.main.Chronometry;
import server.main.aspects.StorageManagerAspect;
import server.main.entities.Key;
import server.main.entities.MailToken;
import server.main.entities.OtpParams;
import server.main.entities.Session;
import server.main.entities.User;
import server.main.proto.service.KeyAttrs;
import server.main.proto.service.KeyPatch;
import server.main.proto.service.Password;

@ExtendWith(MockitoExtension.class)
class AccountOperationsClientTest {
  @Mock private Chronometry mockChronometry;
  private AccountOperationsClient accountOperationsClient;
  private KeyOperationsClient keyOperationsClient;

  @BeforeAll
  static void beforeAll() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
  }

  @BeforeEach
  void beforeEach() {
    accountOperationsClient = new AccountOperationsClient(mockChronometry);
    keyOperationsClient = new KeyOperationsClient();
  }

  @Test
  void createUser_getsUniqueUsername_postsUserAndMailToken() {
    String username = createUniqueUsername();
    Tuple2<User, MailToken> tuple =
        accountOperationsClient.createUser(username, "salt", "hash", "mail@example.com", "0");

    MailToken mailToken = tuple._2;
    assertEquals("0", mailToken.getCode());
    assertEquals("mail@example.com", mailToken.getMail());
    User user = tuple._1;
    assertEquals(User.State.PENDING, user.getState());
    assertEquals(username, user.getUsername());
    assertEquals("salt", user.getSalt());
    assertEquals("hash", user.getHash());
    assertNull(user.getMail());
  }

  @Test
  void createUser_getsExistingUsername_throwsException() {
    String username = createUniqueUsername();
    accountOperationsClient.createUser(username, "", "", "", "0");

    assertThrows(
        StorageException.class,
        () -> accountOperationsClient.createUser(username, "", "", "", "X"));
  }

  @Test
  void getMailToken_foreignToken_returnsEmpty() {
    String username = createUniqueUsername();
    Tuple2<User, MailToken> user = accountOperationsClient.createUser(username, "", "", "", "A");

    assertFalse(
        accountOperationsClient
            .getMailToken(user._1.getIdentifier() + 1, user._2.getIdentifier())
            .isPresent());
  }

  @Test
  void latestMailToken_sortsByCreationTime() {
    long userId = createActiveUser();

    accountOperationsClient.createMailToken(userId, "fst@domain.com", "fst");
    accountOperationsClient.createMailToken(userId, "snd@domain.com", "snd");
    accountOperationsClient.createMailToken(userId, "trd@domain.com", "trd");
    MailToken mailToken = accountOperationsClient.latestMailToken(userId).get();

    assertEquals("trd@domain.com", mailToken.getMail());
  }

  @Test
  void releaseMailToken_removesTokenSetsMailActivatesUser() {
    String username = createUniqueUsername();
    Tuple2<User, MailToken> tuple =
        accountOperationsClient.createUser(username, "", "", "mail@domain.com", "0");
    long userId = tuple._1.getIdentifier();
    long mailTokenId = tuple._2.getIdentifier();

    accountOperationsClient.releaseMailToken(userId, mailTokenId);

    assertFalse(accountOperationsClient.getMailToken(userId, mailTokenId).isPresent());
    User user = accountOperationsClient.getUserByIdentifier(userId).get();
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
            .createKey(
                userIdentifier,
                Password.newBuilder().setValue("").addTags("").build(),
                KeyAttrs.getDefaultInstance())
            .getIdentifier();

    Password password = Password.newBuilder().setValue("value").addTags("tag").build();
    accountOperationsClient.changeMasterKey(
        userIdentifier,
        "salt",
        "hash",
        ImmutableList.of(
            KeyPatch.newBuilder().setIdentifier(keyIdentifier).setPassword(password).build()));

    User user = accountOperationsClient.getUserByIdentifier(userIdentifier).get();
    assertEquals("salt", user.getSalt());
    assertEquals("hash", user.getHash());
    List<Password> passwords =
        keyOperationsClient.readKeys(userIdentifier).stream()
            .map(Key::toPassword)
            .collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  void changeMasterKey_lacksKeyUpdates_throwsException() {
    long userIdentifier = createActiveUser();
    keyOperationsClient.createKey(
        userIdentifier, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance());

    assertThrows(
        StorageException.class,
        () -> accountOperationsClient.changeMasterKey(userIdentifier, "", "", ImmutableList.of()));
  }

  @Test
  void createSession_putsSession() {
    Instant instant = Instant.ofEpochSecond(1);
    when(mockChronometry.currentTime()).thenReturn(instant);
    long userIdentifier = createActiveUser();
    accountOperationsClient.createSession(
        userIdentifier, "key", "127.0.0.1", "Chrome/0.0.0", "version");

    List<Session> list = accountOperationsClient.readSessions(userIdentifier);
    assertEquals(1, list.size());
    Session session = list.get(0);
    assertEquals("key", session.getKey());
    assertEquals("127.0.0.1", session.getIpAddress());
    assertEquals("Chrome/0.0.0", session.getUserAgent());
    assertEquals("version", session.getClientVersion());
    User user = accountOperationsClient.getUserByIdentifier(userIdentifier).get();
    assertEquals(instant, user.getLastSession());
  }

  @Test
  void createMailToken_putsMailToken() {
    long userId = createActiveUser();

    long mailTokenId =
        accountOperationsClient.createMailToken(userId, "user@mail.com", "0").getIdentifier();

    Optional<MailToken> maybeMailToken = accountOperationsClient.getMailToken(userId, mailTokenId);
    assertTrue(maybeMailToken.isPresent());
    MailToken mailToken = maybeMailToken.get();
    assertEquals("user@mail.com", mailToken.getMail());
    assertEquals("0", mailToken.getCode());
  }

  @Test
  void changeUsername_getsExistingUsername_throwsException() {
    long userIdentifier = createActiveUser();
    String username = createUniqueUsername();
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

  @Test
  void createOtpParams_putsOtpParams() {
    long userId = createActiveUser();

    long otpParamsId =
        accountOperationsClient
            .createOtpParams(userId, "secret", ImmutableList.of("a", "b"))
            .getId();

    Optional<OtpParams> maybeOtpParams = accountOperationsClient.getOtpParams(userId, otpParamsId);
    assertTrue(maybeOtpParams.isPresent());
    OtpParams otpParams = maybeOtpParams.get();
    assertEquals(otpParams.getOtpSharedSecret(), "secret");
    assertEquals(otpParams.getScratchCodes(), ImmutableList.of("a", "b"));
  }

  @Test
  void acceptOtpParams_persistsOtpData() {
    long userId = createActiveUser();
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of("a", "b"));

    accountOperationsClient.acceptOtpParams(userId, otpParams.getId());

    assertEquals(Optional.empty(), accountOperationsClient.getOtpParams(userId, otpParams.getId()));
    User user = accountOperationsClient.getUserByIdentifier(userId).get();
    assertEquals("secret", user.getOtpSharedSecret());
    assertEquals(5, user.getOtpSpareAttempts());
    assertTrue(accountOperationsClient.getOtpToken(userId, "a", true).isPresent());
    assertTrue(accountOperationsClient.getOtpToken(userId, "b", true).isPresent());
  }

  @Test
  void createOtpToken_putsOtpToken() {
    long userId = createActiveUser();
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of());
    accountOperationsClient.acceptOtpParams(userId, otpParams.getId());

    accountOperationsClient.createOtpToken(userId, "value");

    assertTrue(accountOperationsClient.getOtpToken(userId, "value", false).isPresent());
  }

  @Test
  void deleteOtpToken_removesOtpToken() {
    long userId = createActiveUser();
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of());
    accountOperationsClient.acceptOtpParams(userId, otpParams.getId());
    accountOperationsClient.createOtpToken(userId, "value");
    long tokenId = accountOperationsClient.getOtpToken(userId, "value", false).get().getId();

    accountOperationsClient.deleteOtpToken(userId, tokenId);

    assertFalse(accountOperationsClient.getOtpToken(userId, "value", false).isPresent());
  }

  @Test
  void resetOtp_removesOtpData() {
    long userId = createActiveUser();
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of("token"));
    accountOperationsClient.acceptOtpParams(userId, otpParams.getId());

    accountOperationsClient.resetOtp(userId);

    User user = accountOperationsClient.getUserByIdentifier(userId).get();
    assertNull(user.getOtpSharedSecret());
    assertEquals(0, user.getOtpSpareAttempts());
    assertFalse(accountOperationsClient.getOtpToken(userId, "token", true).isPresent());
  }

  @Test
  void nudgeMailToken_absentToken_returnsEmpty() {
    long userId = createActiveUser();

    Tuple2<NudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsClient.nudgeMailToken(
            userId, 8L, (lastAttempt, attemptCount) -> lastAttempt.plusSeconds(attemptCount));

    assertEquals(NudgeStatus.NOT_FOUND, nudgeResult._1);
  }

  @Test
  void nudgeMailToken_notAvailable_returnsFalse() {
    long userId = createActiveUser();
    long mailTokenId =
        accountOperationsClient.createMailToken(userId, "mail@domain.com", "A").getIdentifier();
    Instant epochPlusFour = Instant.ofEpochSecond(4);
    Instant epochPlusTwo = Instant.ofEpochSecond(2);
    when(mockChronometry.currentTime()).thenReturn(epochPlusTwo);
    when(mockChronometry.isBefore(epochPlusFour, epochPlusTwo)).thenReturn(false);

    Tuple2<NudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsClient.nudgeMailToken(
            userId, mailTokenId, (lastAttempt, attemptCount) -> epochPlusFour);

    assertEquals(NudgeStatus.NOT_AVAILABLE_YET, nudgeResult._1);
  }

  @Test
  void nudgeMailToken_available_updatesTrail() {
    long userId = createActiveUser();
    long mailTokenId =
        accountOperationsClient.createMailToken(userId, "mail@domain.com", "A").getIdentifier();
    Instant epochPlusOne = Instant.ofEpochSecond(1);
    Instant epochPlusTwo = Instant.ofEpochSecond(2);
    when(mockChronometry.currentTime()).thenReturn(epochPlusTwo);
    when(mockChronometry.isBefore(epochPlusOne, epochPlusTwo)).thenReturn(true);

    Tuple2<NudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsClient.nudgeMailToken(
            userId, mailTokenId, (lastAttempt, attemptCount) -> epochPlusOne);

    assertEquals(NudgeStatus.OK, nudgeResult._1);
    assertTrue(nudgeResult._2.isPresent());
    MailToken mailToken = accountOperationsClient.getMailToken(userId, mailTokenId).get();
    assertEquals(epochPlusTwo, mailToken.getLastAttempt());
    assertEquals(1, mailToken.getAttemptCount());
  }

  private long createActiveUser() {
    String username = createUniqueUsername();
    Tuple2<User, MailToken> user = accountOperationsClient.createUser(username, "", "", "", "");
    long userId = user._1.getIdentifier();
    accountOperationsClient.releaseMailToken(userId, user._2.getIdentifier());
    return userId;
  }

  private String createUniqueUsername() {
    return UUID.randomUUID().toString();
  }
}
