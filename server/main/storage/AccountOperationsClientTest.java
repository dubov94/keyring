package keyring.server.main.storage;

import static java.util.stream.Collectors.toList;
import static keyring.server.main.storage.AccountOperationsInterface.MtNudgeStatus;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableList;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import javax.persistence.Persistence;
import keyring.server.main.Arithmetic;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.MailTokenState;
import keyring.server.main.entities.columns.SessionStage;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.proto.service.KeyAttrs;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MockitoExtension.class)
class AccountOperationsClientTest {
  private static final String IP_ADDRESS = "127.0.0.1";

  private Supplier<Instant> nowSupplier = Instant::now;
  private AccountOperationsClient accountOperationsClient;
  private KeyOperationsClient keyOperationsClient;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class)
        .initialize(Persistence.createEntityManagerFactory("testing"));
    Limiters limiters =
        new Limiters(
            Key.APPROX_MAX_KEYS_PER_USER,
            MailToken.APPROX_MAX_MAIL_TOKENS_PER_USER,
            MailToken.APPROX_MAX_MAIL_TOKENS_PER_IP_ADDRESS,
            Session.APPROX_MAX_LAST_HOUR_SESSIONS_PER_USER,
            OtpParams.APPROX_MAX_OTP_PARAMS_PER_USER);
    accountOperationsClient =
        new AccountOperationsClient(
            new Chronometry(new Arithmetic(), () -> nowSupplier.get()),
            limiters,
            /* initialSpareAttempts */ 5);
    keyOperationsClient = new KeyOperationsClient(limiters);
  }

  @Test
  @WithEntityManager
  void createUser_getsUniqueUsername_postsUserAndMailToken() {
    Tuple2<User, MailToken> tuple =
        accountOperationsClient.createUser(
            "username", "salt", "hash", IP_ADDRESS, "mail@example.com", "0");

    MailToken mailToken = tuple._2;
    assertEquals(MailTokenState.MAIL_TOKEN_PENDING, mailToken.getState());
    assertEquals("0", mailToken.getCode());
    assertEquals("mail@example.com", mailToken.getMail());
    User user = tuple._1;
    assertEquals(UserState.USER_PENDING, user.getState());
    assertEquals("username", user.getUsername());
    assertEquals("salt", user.getSalt());
    assertEquals("hash", user.getHash());
    assertNull(user.getMail());
  }

  @Test
  @WithEntityManager
  void createUser_getsExistingUsername_throwsException() {
    accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "", "0");

    StorageException exception =
        assertThrows(
            StorageException.class,
            () -> accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "", "X"));

    assertTrue(
        Throwables.getRootCause(exception)
            .getMessage()
            .contains("duplicate key value violates unique constraint"));
  }

  @Test
  @WithEntityManager
  void getMailToken_foreignToken_returnsEmpty() {
    Tuple2<User, MailToken> user =
        accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "", "A");
    long wrongUserId = user._1.getIdentifier() + 1;
    UUID tokenUuid = user._2.getUuid();

    assertFalse(accountOperationsClient.getMailToken(wrongUserId, tokenUuid).isPresent());
  }

  @Test
  @WithEntityManager
  void getMailToken_unavailableToken_returnsEmpty() {
    Tuple2<User, MailToken> user =
        accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "", "A");
    nowSupplier = () -> Instant.MAX;
    long userId = user._1.getIdentifier();
    UUID tokenUuid = user._2.getUuid();

    assertFalse(accountOperationsClient.getMailToken(userId, tokenUuid).isPresent());
  }

  @Test
  @WithEntityManager
  void latestMailToken_sortsByCreationTime() {
    long userId = createActiveUser()._1;
    accountOperationsClient.createMailToken(userId, IP_ADDRESS, "fst@domain.com", "fst");
    accountOperationsClient.createMailToken(userId, IP_ADDRESS, "snd@domain.com", "snd");
    accountOperationsClient.createMailToken(userId, IP_ADDRESS, "trd@domain.com", "trd");

    MailToken mailToken = accountOperationsClient.latestMailToken(userId).get();

    assertEquals("trd@domain.com", mailToken.getMail());
  }

  @Test
  @WithEntityManager
  void latestMailToken_ignoresUnavailable() {
    long userId = createActiveUser()._1;
    accountOperationsClient.createMailToken(userId, IP_ADDRESS, "mail@example.com", "0");
    nowSupplier = () -> Instant.MAX;

    assertFalse(accountOperationsClient.latestMailToken(userId).isPresent());
  }

  @Test
  @WithEntityManager
  void releaseMailToken_updatesTokenSetsMailActivatesUser() {
    Tuple2<User, MailToken> tuple =
        accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "mail@domain.com", "0");
    long userId = tuple._1.getIdentifier();
    UUID mailTokenUuid = tuple._2.getUuid();

    accountOperationsClient.releaseMailToken(userId, mailTokenUuid);

    MailToken mailToken = accountOperationsClient.getMailToken(userId, mailTokenUuid).get();
    assertEquals(MailTokenState.MAIL_TOKEN_ACCEPTED, mailToken.getState());
    User user = accountOperationsClient.getUserById(userId).get();
    assertEquals("mail@domain.com", user.getMail());
    assertEquals(UserState.USER_ACTIVE, user.getState());
  }

  @Test
  @WithEntityManager
  void releaseMailToken_acceptedToken_throwsException() {
    Tuple2<User, MailToken> tuple =
        accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "mail@example.com", "0");
    long userId = tuple._1.getIdentifier();
    UUID mailTokenUuid = tuple._2.getUuid();
    accountOperationsClient.releaseMailToken(userId, mailTokenUuid);

    StorageException exception =
        assertThrows(
            StorageException.class,
            () -> accountOperationsClient.releaseMailToken(userId, mailTokenUuid));

    assertEquals(
        String.format(
            "java.lang.IllegalArgumentException:"
                + " MailToken %s cannot be released,"
                + " its state is MAIL_TOKEN_ACCEPTED",
            mailTokenUuid),
        exception.getMessage());
  }

  @Test
  @WithEntityManager
  void getUserByName_userDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountOperationsClient.getUserByName(""));
  }

  @Test
  @WithEntityManager
  void getUserById_userDoesNotExist_returnsEmpty() {
    assertEquals(Optional.empty(), accountOperationsClient.getUserById(Long.MAX_VALUE));
  }

  @Test
  @WithEntityManager
  void changeMasterKey_updatesSaltHashAndKeys() {
    Tuple2<Long, Long> userRefs = createActiveUser();
    long userId = userRefs._1;
    long sessionId = createActiveSession(userId, userRefs._2);
    UUID keyUuid =
        keyOperationsClient
            .createKey(
                sessionId,
                Password.newBuilder().setValue("").addTags("").build(),
                KeyAttrs.getDefaultInstance())
            .getUuid();

    Password password = Password.newBuilder().setValue("value").addTags("tag").build();
    List<Session> disabledSessions =
        accountOperationsClient.changeMasterKey(
            userId,
            "salt",
            "hash",
            ImmutableList.of(
                KeyPatch.newBuilder()
                    .setUid(String.valueOf(keyUuid))
                    .setPassword(password)
                    .build()));

    assertEquals(1, disabledSessions.size());
    Session deletedSession = disabledSessions.get(0);
    assertEquals(sessionId, deletedSession.getIdentifier());
    assertEquals(SessionStage.SESSION_DISABLED, deletedSession.getStage());
    User user = accountOperationsClient.getUserById(userId).get();
    assertEquals("salt", user.getSalt());
    assertEquals("hash", user.getHash());
    List<Password> passwords =
        keyOperationsClient.readKeys(createActiveSession(userId, user.getVersion())).stream()
            .map(Key::toPassword)
            .collect(toList());
    assertEquals(1, passwords.size());
    assertEquals(password, passwords.get(0));
  }

  @Test
  @WithEntityManager
  void changeMasterKey_lacksKeyUpdates_throwsException() {
    Tuple2<Long, Long> userRefs = createActiveUser();
    long userId = userRefs._1;
    long sessionId = createActiveSession(userId, userRefs._2);
    UUID keyUuid =
        keyOperationsClient
            .createKey(sessionId, Password.getDefaultInstance(), KeyAttrs.getDefaultInstance())
            .getUuid();

    StorageException exception =
        assertThrows(
            StorageException.class,
            () -> accountOperationsClient.changeMasterKey(userId, "", "", ImmutableList.of()));

    assertEquals(
        String.format("java.lang.IllegalArgumentException: Missing `KeyPatch` for key %s", keyUuid),
        exception.getMessage());
  }

  @Test
  @WithEntityManager
  void createSession_putsSession() {
    Tuple2<Long, Long> userRefs = createActiveUser();
    long userId = userRefs._1;
    long sessionId =
        accountOperationsClient
            .createSession(userId, userRefs._2, "127.0.0.1", "Chrome/0.0.0", "version")
            .getIdentifier();

    Session session = accountOperationsClient.mustGetSession(userId, sessionId);
    assertEquals(SessionStage.UNKNOWN_SESSION_STAGE, session.getStage());
    assertEquals("127.0.0.1", session.getIpAddress());
    assertEquals("Chrome/0.0.0", session.getUserAgent());
    assertEquals("version", session.getClientVersion());
  }

  @Test
  @WithEntityManager
  void initiateSession_setsSession() {
    Tuple2<Long, Long> userRefs = createActiveUser();
    long userId = userRefs._1;
    long sessionId =
        accountOperationsClient
            .createSession(userId, userRefs._2, IP_ADDRESS, "Chrome/0.0.0", "version")
            .getIdentifier();

    accountOperationsClient.initiateSession(userId, sessionId, "prefix:initiation-key");

    Session session = accountOperationsClient.mustGetSession(userId, sessionId);
    assertEquals("prefix:initiation-key", session.getKey());
    assertEquals(SessionStage.SESSION_INITIATED, session.getStage());
  }

  @Test
  @WithEntityManager
  void activateSession_setsSession() {
    Tuple2<Long, Long> userRefs = createActiveUser();
    long userId = userRefs._1;
    long sessionId =
        accountOperationsClient
            .createSession(userId, userRefs._2, IP_ADDRESS, "Chrome/0.0.0", "version")
            .getIdentifier();
    accountOperationsClient.initiateSession(userId, sessionId, "before:initiation-key");

    accountOperationsClient.activateSession(userId, sessionId, "after:activation-key");

    Session session = accountOperationsClient.mustGetSession(userId, sessionId);
    assertEquals("after:activation-key", session.getKey());
    assertEquals(SessionStage.SESSION_ACTIVATED, session.getStage());
    assertTrue(
        Duration.between(session.getUser().getLastSession(), Instant.now()).getSeconds() < 4);
  }

  @Test
  @WithEntityManager
  void createMailToken_putsMailToken() {
    long userId = createActiveUser()._1;

    UUID mailTokenUuid =
        accountOperationsClient.createMailToken(userId, IP_ADDRESS, "user@mail.com", "0").getUuid();

    Optional<MailToken> maybeMailToken =
        accountOperationsClient.getMailToken(userId, mailTokenUuid);
    assertTrue(maybeMailToken.isPresent());
    MailToken mailToken = maybeMailToken.get();
    assertEquals(MailTokenState.MAIL_TOKEN_PENDING, mailToken.getState());
    assertEquals("user@mail.com", mailToken.getMail());
    assertEquals("0", mailToken.getCode());
  }

  @Test
  @WithEntityManager
  void changeUsername_getsExistingUsername_throwsException() {
    long userId = createActiveUser()._1;
    accountOperationsClient.createUser("random", "", "", IP_ADDRESS, "", "");

    StorageException exception =
        assertThrows(
            StorageException.class, () -> accountOperationsClient.changeUsername(userId, "random"));

    assertTrue(
        Throwables.getRootCause(exception)
            .getMessage()
            .contains("duplicate key value violates unique constraint"));
  }

  @Test
  @WithEntityManager
  void changeUsername_getsUniqueUsername_updatesUsername() {
    long userId = createActiveUser()._1;

    accountOperationsClient.changeUsername(userId, "random");

    Optional<User> maybeUser = accountOperationsClient.getUserById(userId);
    assertTrue(maybeUser.isPresent());
    User user = maybeUser.get();
    assertEquals("random", user.getUsername());
  }

  @Test
  @WithEntityManager
  void markAccountAsDeleted_updatesState() {
    long userId = createActiveUser()._1;

    accountOperationsClient.markAccountAsDeleted(userId);

    Optional<User> maybeUser = accountOperationsClient.getUserById(userId);
    assertTrue(maybeUser.isPresent());
    User user = maybeUser.get();
    assertEquals(UserState.USER_DELETED, user.getState());
  }

  @Test
  @WithEntityManager
  void createOtpParams_putsOtpParams() {
    long userId = createActiveUser()._1;

    UUID otpParamsUuid =
        accountOperationsClient
            .createOtpParams(userId, "secret", ImmutableList.of("a", "b"))
            .getUuid();

    Optional<OtpParams> maybeOtpParams =
        accountOperationsClient.getOtpParams(userId, otpParamsUuid);
    assertTrue(maybeOtpParams.isPresent());
    OtpParams otpParams = maybeOtpParams.get();
    assertEquals(otpParams.getOtpSharedSecret(), "secret");
    assertEquals(otpParams.getScratchCodes(), ImmutableList.of("a", "b"));
  }

  @Test
  @WithEntityManager
  void acceptOtpParams_persistsOtpData() {
    long userId = createActiveUser()._1;
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of("a", "b"));

    accountOperationsClient.acceptOtpParams(userId, otpParams.getUuid());

    assertEquals(
        Optional.empty(), accountOperationsClient.getOtpParams(userId, otpParams.getUuid()));
    User user = accountOperationsClient.getUserById(userId).get();
    assertEquals("secret", user.getOtpSharedSecret());
    assertEquals(5, user.getOtpSpareAttempts());
    assertTrue(accountOperationsClient.getOtpToken(userId, "a", true).isPresent());
    assertTrue(accountOperationsClient.getOtpToken(userId, "b", true).isPresent());
  }

  @Test
  @WithEntityManager
  void createTrustedToken_putsOtpToken() {
    long userId = createActiveUser()._1;
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of());
    accountOperationsClient.acceptOtpParams(userId, otpParams.getUuid());

    accountOperationsClient.createTrustedToken(userId, "value");

    assertTrue(accountOperationsClient.getOtpToken(userId, "value", false).isPresent());
  }

  @Test
  @WithEntityManager
  void deleteOtpToken_removesOtpToken() {
    long userId = createActiveUser()._1;
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of());
    accountOperationsClient.acceptOtpParams(userId, otpParams.getUuid());
    accountOperationsClient.createTrustedToken(userId, "value");
    long tokenId = accountOperationsClient.getOtpToken(userId, "value", false).get().getId();

    accountOperationsClient.deleteOtpToken(userId, tokenId);

    assertFalse(accountOperationsClient.getOtpToken(userId, "value", false).isPresent());
  }

  @Test
  @WithEntityManager
  void resetOtp_removesOtpData() {
    long userId = createActiveUser()._1;
    OtpParams otpParams =
        accountOperationsClient.createOtpParams(userId, "secret", ImmutableList.of("token"));
    accountOperationsClient.acceptOtpParams(userId, otpParams.getUuid());

    accountOperationsClient.resetOtp(userId);

    User user = accountOperationsClient.getUserById(userId).get();
    assertNull(user.getOtpSharedSecret());
    assertEquals(0, user.getOtpSpareAttempts());
    assertFalse(accountOperationsClient.getOtpToken(userId, "token", true).isPresent());
  }

  @Test
  @WithEntityManager
  void nudgeMailToken_absentToken_returnsEmpty() {
    long userId = createActiveUser()._1;

    Tuple2<MtNudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsClient.nudgeMailToken(
            userId,
            UUID.randomUUID(),
            (lastAttempt, attemptCount) -> lastAttempt.plusSeconds(attemptCount));

    assertEquals(MtNudgeStatus.NOT_FOUND, nudgeResult._1);
  }

  @Test
  @WithEntityManager
  void nudgeMailToken_notAvailable_returnsFalse() {
    long userId = createActiveUser()._1;
    UUID mailTokenUuid =
        accountOperationsClient
            .createMailToken(userId, IP_ADDRESS, "mail@domain.com", "A")
            .getUuid();
    Instant epochPlusTwo = Instant.ofEpochSecond(2);
    Instant epochPlusFour = Instant.ofEpochSecond(4);
    nowSupplier = () -> epochPlusTwo;

    Tuple2<MtNudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsClient.nudgeMailToken(
            userId, mailTokenUuid, (lastAttempt, attemptCount) -> epochPlusFour);

    assertEquals(MtNudgeStatus.NOT_AVAILABLE_YET, nudgeResult._1);
  }

  @Test
  @WithEntityManager
  void nudgeMailToken_available_updatesTrail() {
    long userId = createActiveUser()._1;
    UUID mailTokenUuid =
        accountOperationsClient
            .createMailToken(userId, IP_ADDRESS, "mail@domain.com", "A")
            .getUuid();
    Instant epochPlusOne = Instant.ofEpochSecond(1);
    Instant epochPlusTwo = Instant.ofEpochSecond(2);
    nowSupplier = () -> epochPlusTwo;

    Tuple2<MtNudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsClient.nudgeMailToken(
            userId, mailTokenUuid, (lastAttempt, attemptCount) -> epochPlusOne);

    assertEquals(MtNudgeStatus.OK, nudgeResult._1);
    assertTrue(nudgeResult._2.isPresent());
    MailToken mailToken = accountOperationsClient.getMailToken(userId, mailTokenUuid).get();
    assertEquals(epochPlusTwo, mailToken.getLastAttempt());
    assertEquals(1, mailToken.getAttemptCount());
  }

  private Tuple2<Long, Long> createActiveUser() {
    Tuple2<User, MailToken> user =
        accountOperationsClient.createUser("username", "", "", IP_ADDRESS, "", "");
    long userId = user._1.getIdentifier();
    accountOperationsClient.releaseMailToken(userId, user._2.getUuid());
    return Tuple.of(userId, user._1.getVersion());
  }

  private String newRandomUuid() {
    return UUID.randomUUID().toString();
  }

  private long createActiveSession(long userId, long userVersion) {
    long sessionId =
        accountOperationsClient
            .createSession(userId, userVersion, IP_ADDRESS, "Chrome/0.0.0", "version")
            .getIdentifier();
    accountOperationsClient.initiateSession(
        userId, sessionId, String.format("authn:%s", newRandomUuid()));
    accountOperationsClient.activateSession(
        userId, sessionId, String.format("session:%s", newRandomUuid()));
    return sessionId;
  }
}
