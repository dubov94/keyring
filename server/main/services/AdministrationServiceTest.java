package keyring.server.main.services;

import static keyring.server.main.storage.AccountOperationsInterface.MtNudgeStatus;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.common.collect.ImmutableList;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.vavr.Tuple;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiFunction;
import java.util.function.Function;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import keyring.server.main.Chronometry;
import keyring.server.main.Cryptography;
import keyring.server.main.MailClient;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.aspects.ValidateUserAspect;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.SessionStage;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.geolocation.GeolocationServiceInterface;
import keyring.server.main.interceptors.SessionAccessor;
import keyring.server.main.keyvalue.KeyValueClient;
import keyring.server.main.keyvalue.values.KvSession;
import keyring.server.main.proto.service.*;
import keyring.server.main.storage.AccountOperationsInterface;
import keyring.server.main.storage.KeyOperationsInterface;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
class AdministrationServiceTest {
  @Mock private EntityManagerFactory mockEntityManagerFactory;
  @Mock private EntityManager mockEntityManager;
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private GeolocationServiceInterface mockGeolocationServiceInterface;
  @Mock private SessionAccessor mockSessionAccessor;
  @Mock private KeyValueClient mockKeyValueClient;
  @Mock private StreamObserver mockStreamObserver;
  @Mock private Cryptography mockCryptography;
  @Mock private MailClient mockMailClient;
  @Mock private IGoogleAuthenticator mockGoogleAuthenticator;
  @Mock private Chronometry mockChronometry;

  private User user =
      new User()
          .setIdentifier(7L)
          .setState(UserState.ACTIVE)
          .setUsername("username")
          .setSalt("salt")
          .setHash("hash");
  private KvSession kvSession =
      KvSession.newBuilder().setUserId(user.getIdentifier()).setSessionEntityId(8L).build();
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(mockEntityManagerFactory);
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(mockSessionAccessor, mockAccountOperationsInterface);
    administrationService =
        new AdministrationService(
            mockKeyOperationsInterface,
            mockAccountOperationsInterface,
            mockGeolocationServiceInterface,
            mockSessionAccessor,
            mockKeyValueClient,
            mockCryptography,
            mockMailClient,
            mockGoogleAuthenticator,
            mockChronometry);
    when(mockEntityManagerFactory.createEntityManager()).thenReturn(mockEntityManager);
    when(mockSessionAccessor.getUserId()).thenReturn(kvSession.getUserId());
    when(mockSessionAccessor.getKvSession()).thenReturn(kvSession);
    when(mockAccountOperationsInterface.getUserByIdentifier(user.getIdentifier()))
        .thenAnswer(invocation -> Optional.of(user));
  }

  @Test
  void releaseMailToken_tokenDoesNotExist_repliesWithError() {
    when(mockAccountOperationsInterface.nudgeMailToken(
            eq(user.getIdentifier()), eq(1L), any(BiFunction.class)))
        .thenReturn(Tuple.of(MtNudgeStatus.NOT_FOUND, Optional.empty()));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setTokenId(1L).setCode("0").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ReleaseMailTokenResponse.newBuilder()
                .setError(ReleaseMailTokenResponse.Error.INVALID_TOKEN_ID)
                .build());
  }

  @Test
  void releaseMailToken_tooEarly_repliesWithError() {
    when(mockAccountOperationsInterface.nudgeMailToken(
            eq(user.getIdentifier()), eq(1L), any(BiFunction.class)))
        .thenReturn(Tuple.of(MtNudgeStatus.NOT_AVAILABLE_YET, Optional.empty()));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setTokenId(1L).setCode("A").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ReleaseMailTokenResponse.newBuilder()
                .setError(ReleaseMailTokenResponse.Error.TOO_MANY_REQUESTS)
                .build());
  }

  @Test
  void releaseMailToken_codeDoesNotMatch_repliesWithError() {
    when(mockAccountOperationsInterface.nudgeMailToken(
            eq(user.getIdentifier()), eq(1L), any(BiFunction.class)))
        .thenReturn(
            Tuple.of(
                MtNudgeStatus.OK, Optional.of(new MailToken().setIdentifier(1L).setCode("X"))));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setTokenId(1L).setCode("A").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ReleaseMailTokenResponse.newBuilder()
                .setError(ReleaseMailTokenResponse.Error.INVALID_CODE)
                .build());
  }

  @Test
  void releaseMailToken_tokenExistsAndCodeMatches_repliesWithMail() {
    long userId = user.getIdentifier();
    when(mockAccountOperationsInterface.nudgeMailToken(eq(userId), eq(1L), any(BiFunction.class)))
        .thenReturn(
            Tuple.of(
                MtNudgeStatus.OK,
                Optional.of(
                    new MailToken().setIdentifier(1L).setCode("A").setMail("mail@example.com"))));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setTokenId(1L).setCode("A").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).releaseMailToken(userId, 1L);
    verify(mockStreamObserver)
        .onNext(ReleaseMailTokenResponse.newBuilder().setMail("mail@example.com").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void createKey_userNotActive_repliesUnauthenticated() {
    user.setState(UserState.PENDING);

    administrationService.createKey(CreateKeyRequest.getDefaultInstance(), mockStreamObserver);

    verifyOnError(Status.UNAUTHENTICATED);
  }

  @Test
  void changeMasterKey_digestDoesNotMatchHash_repliesWithError() {
    when(mockCryptography.validateA2p("")).thenReturn(true);
    when(mockCryptography.validateDigest("")).thenReturn(true);
    when(mockCryptography.doesDigestMatchHash("random", "hash")).thenReturn(false);

    administrationService.changeMasterKey(
        ChangeMasterKeyRequest.newBuilder().setCurrentDigest("random").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.INVALID_CURRENT_DIGEST)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void changeMasterKey_digestsMatch_repliesWithDefault() {
    long userId = user.getIdentifier();
    KeyPatch keyPatch = KeyPatch.newBuilder().setIdentifier(0L).build();
    when(mockCryptography.validateA2p("prefix")).thenReturn(true);
    when(mockCryptography.validateDigest("suffix")).thenReturn(true);
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockCryptography.computeHash("suffix")).thenReturn("xiffus");
    String oldSessionKey = "prefix:old-session-token";
    Session oldSession = new Session().setKey(oldSessionKey);
    ImmutableList<Session> sessions =
        ImmutableList.of(new Session().setKey("prefix:random"), oldSession);
    when(mockAccountOperationsInterface.changeMasterKey(
            userId, "prefix", "xiffus", ImmutableList.of(keyPatch)))
        .thenReturn(sessions);
    when(mockAccountOperationsInterface.mustGetSession(userId, kvSession.getSessionEntityId()))
        .thenReturn(oldSession);
    when(mockAccountOperationsInterface.createSession(
            userId,
            0L,
            oldSession.getIpAddress(),
            oldSession.getUserAgent(),
            oldSession.getClientVersion()))
        .thenReturn(new Session().setIdentifier(12L));
    String newSessionToken = "new-session-token";
    when(mockCryptography.generateTts()).thenReturn(newSessionToken);
    String newSessionKey = "prefix:new-session-key";
    when(mockKeyValueClient.convertSessionTokenToKey(newSessionToken)).thenReturn(newSessionKey);

    administrationService.changeMasterKey(
        ChangeMasterKeyRequest.newBuilder()
            .setCurrentDigest("digest")
            .setRenewal(
                ChangeMasterKeyRequest.Renewal.newBuilder()
                    .setSalt("prefix")
                    .setDigest("suffix")
                    .addKeys(keyPatch)
                    .build())
            .build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface)
        .changeMasterKey(7L, "prefix", "xiffus", ImmutableList.of(keyPatch));
    verify(mockKeyValueClient).safelyDeleteSeRefs(sessions);
    verify(mockAccountOperationsInterface).activateSession(userId, 12L, newSessionKey);
    verify(mockKeyValueClient).createSession(newSessionToken, userId, 12L);
    verify(mockStreamObserver)
        .onNext(ChangeMasterKeyResponse.newBuilder().setSessionKey("new-session-token").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void acquireMailToken_digestsMismatch_repliesWithError() {
    when(mockCryptography.doesDigestMatchHash("digest", "random")).thenReturn(false);
    administrationService.acquireMailToken(
        AcquireMailTokenRequest.newBuilder()
            .setMail("mail@example.com")
            .setDigest("random")
            .build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            AcquireMailTokenResponse.newBuilder()
                .setError(AcquireMailTokenResponse.Error.INVALID_DIGEST)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void acquireMailToken_digestsMatch_repliesWithTokenId() {
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockCryptography.generateUacs()).thenReturn("17");
    when(mockAccountOperationsInterface.createMailToken(7L, "user@mail.com", "17"))
        .thenReturn(new MailToken().setIdentifier(1L));

    administrationService.acquireMailToken(
        AcquireMailTokenRequest.newBuilder().setDigest("digest").setMail("user@mail.com").build(),
        mockStreamObserver);

    verify(mockMailClient).sendMailVc("user@mail.com", "17");
    verify(mockStreamObserver).onNext(AcquireMailTokenResponse.newBuilder().setTokenId(1L).build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void changeUsername_digestsMismatch_repliesWithError() {
    when(mockCryptography.doesDigestMatchHash("random", "hash")).thenReturn(false);
    administrationService.changeUsername(
        ChangeUsernameRequest.newBuilder().setUsername("username").setDigest("random").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ChangeUsernameResponse.newBuilder()
                .setError(ChangeUsernameResponse.Error.INVALID_DIGEST)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void changeUsername_getsExistingUsername_repliesWithError() {
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(Optional.of(new User()));

    administrationService.changeUsername(
        ChangeUsernameRequest.newBuilder().setDigest("digest").setUsername("username").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ChangeUsernameResponse.newBuilder()
                .setError(ChangeUsernameResponse.Error.NAME_TAKEN)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void changeUsername_getsUniqueUsername_repliesWithDefault() {
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());

    administrationService.changeUsername(
        ChangeUsernameRequest.newBuilder().setDigest("digest").setUsername("username").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).changeUsername(7L, "username");
    verify(mockStreamObserver).onNext(ChangeUsernameResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void deleteAccount_digestsMismatch_repliesWithError() {
    when(mockCryptography.doesDigestMatchHash("digest", "random")).thenReturn(false);
    administrationService.deleteAccount(
        DeleteAccountRequest.newBuilder().setDigest("random").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            DeleteAccountResponse.newBuilder()
                .setError(DeleteAccountResponse.Error.INVALID_DIGEST)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void deleteAccount_digestsMatch_repliesWithDefault() {
    ImmutableList<Session> sessions = ImmutableList.of(new Session().setKey("prefix:session"));
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockAccountOperationsInterface.readSessions(
            7L, Optional.of(ImmutableList.of(SessionStage.DISABLED))))
        .thenReturn(sessions);

    administrationService.deleteAccount(
        DeleteAccountRequest.newBuilder().setDigest("digest").build(), mockStreamObserver);

    verify(mockKeyValueClient).safelyDeleteSeRefs(sessions);
    verify(mockAccountOperationsInterface).markAccountAsDeleted(7L);
    verify(mockStreamObserver).onNext(DeleteAccountResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void getRecentSessions_returnsOrderedList() {
    Function<Instant, Session> createDatabaseSession =
        instant ->
            new Session()
                .setTimestamp(instant)
                .setIpAddress("127.0.0.1")
                .setUserAgent("Chrome/0.0.0")
                .setStage(SessionStage.ACTIVATED, instant);
    when(mockAccountOperationsInterface.readSessions(7L, Optional.empty()))
        .thenReturn(
            ImmutableList.of(
                createDatabaseSession.apply(Instant.ofEpochSecond(1)),
                createDatabaseSession.apply(Instant.ofEpochSecond(2))));
    when(mockGeolocationServiceInterface.getIpInfo("127.0.0.1"))
        .thenReturn(Geolocation.newBuilder().setCountry("Country").setCity("City").build());

    administrationService.getRecentSessions(
        GetRecentSessionsRequest.getDefaultInstance(), mockStreamObserver);

    Function<Long, GetRecentSessionsResponse.Session> createResponseSession =
        millis ->
            GetRecentSessionsResponse.Session.newBuilder()
                .setCreationTimeInMillis(millis)
                .setIpAddress("127.0.0.1")
                .setUserAgent("Chrome/0.0.0")
                .setGeolocation(
                    Geolocation.newBuilder().setCountry("Country").setCity("City").build())
                .setStatus(GetRecentSessionsResponse.Session.Status.ACTIVATED)
                .build();
    verify(mockStreamObserver)
        .onNext(
            GetRecentSessionsResponse.newBuilder()
                .addAllSessions(
                    ImmutableList.of(
                        createResponseSession.apply(2000L), createResponseSession.apply(1000L)))
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void generateOtpParams_returnsParams() {
    when(mockGoogleAuthenticator.createCredentials())
        .thenReturn(new GoogleAuthenticatorKey.Builder("secret").build());
    final AtomicInteger ttsCounter = new AtomicInteger(0);
    when(mockCryptography.generateTts())
        .thenAnswer((invocation) -> String.valueOf(ttsCounter.incrementAndGet()));
    ImmutableList<String> scratchCodes = ImmutableList.of("1", "2", "3", "4", "5");
    when(mockAccountOperationsInterface.createOtpParams(7L, "secret", scratchCodes))
        .thenReturn(new OtpParams().setId(1L));

    administrationService.generateOtpParams(
        GenerateOtpParamsRequest.getDefaultInstance(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            GenerateOtpParamsResponse.newBuilder()
                .setOtpParamsId("1")
                .setSharedSecret("secret")
                .setKeyUri(
                    "otpauth://totp/parolica.com:username?secret=secret&issuer=parolica.com&algorithm=SHA1&digits=6&period=30")
                .addAllScratchCodes(scratchCodes)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void acceptOtpParams_codeMatches_completesSuccessfully() {
    when(mockAccountOperationsInterface.getOtpParams(7L, 1L))
        .thenReturn(Optional.of(new OtpParams().setId(1L).setOtpSharedSecret("secret")));
    when(mockCryptography.convertTotp("42")).thenReturn(Optional.of(42));
    when(mockGoogleAuthenticator.authorize("secret", 42)).thenReturn(true);
    when(mockCryptography.generateTts()).thenReturn("token");

    administrationService.acceptOtpParams(
        AcceptOtpParamsRequest.newBuilder()
            .setOtpParamsId("1")
            .setOtp("42")
            .setYieldTrustedToken(true)
            .build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).acceptOtpParams(user.getIdentifier(), 1L);
    verify(mockAccountOperationsInterface).createOtpToken(7L, "token");
    verify(mockStreamObserver)
        .onNext(AcceptOtpParamsResponse.newBuilder().setTrustedToken("token").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void resetOtpParams_totpMatches_triggersReset() {
    user.setOtpSharedSecret("secret");
    when(mockCryptography.convertTotp("42")).thenReturn(Optional.of(42));
    when(mockGoogleAuthenticator.authorize("secret", 42)).thenReturn(true);

    administrationService.resetOtp(
        ResetOtpRequest.newBuilder().setOtp("42").build(), mockStreamObserver);

    verify(mockAccountOperationsInterface).resetOtp(7L);
    verify(mockStreamObserver).onNext(ResetOtpResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void resetOtpParams_ttsMatches_triggersReset() {
    user.setOtpSharedSecret("secret");
    when(mockCryptography.convertTotp("token")).thenReturn(Optional.empty());
    when(mockAccountOperationsInterface.getOtpToken(7L, "token", true))
        .thenReturn(Optional.of(new OtpToken().setId(1L)));

    administrationService.resetOtp(
        ResetOtpRequest.newBuilder().setOtp("token").build(), mockStreamObserver);

    verify(mockAccountOperationsInterface).resetOtp(7L);
    verify(mockStreamObserver).onNext(ResetOtpResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  private void verifyOnError(Status status) {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(status, argumentCaptor.getValue().getStatus());
  }
}
