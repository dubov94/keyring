package server.main.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.common.collect.ImmutableList;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import server.main.Cryptography;
import server.main.MailClient;
import server.main.aspects.ValidateUserAspect;
import server.main.entities.MailToken;
import server.main.entities.OtpParams;
import server.main.entities.OtpToken;
import server.main.entities.Session;
import server.main.entities.User;
import server.main.geolocation.GeolocationServiceInterface;
import server.main.interceptors.SessionAccessor;
import server.main.keyvalue.KeyValueClient;
import server.main.proto.service.*;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.KeyOperationsInterface;

@ExtendWith(MockitoExtension.class)
class AdministrationServiceTest {
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private GeolocationServiceInterface mockGeolocationServiceInterface;
  @Mock private SessionAccessor mockSessionAccessor;
  @Mock private KeyValueClient mockKeyValueClient;
  @Mock private StreamObserver mockStreamObserver;
  @Mock private Cryptography mockCryptography;
  @Mock private MailClient mockMailClient;
  @Mock private IGoogleAuthenticator mockGoogleAuthenticator;

  private User user =
      new User()
          .setIdentifier(7L)
          .setState(User.State.ACTIVE)
          .setUsername("username")
          .setSalt("salt")
          .setHash("hash");
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
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
            mockGoogleAuthenticator);
    long userIdentifier = user.getIdentifier();
    when(mockSessionAccessor.getUserIdentifier()).thenReturn(userIdentifier);
    when(mockAccountOperationsInterface.getUserByIdentifier(userIdentifier))
        .thenAnswer(invocation -> Optional.of(user));
  }

  @Test
  void releaseMailToken_codeDoesNotExist_repliesWithError() {
    when(mockAccountOperationsInterface.getMailToken(user.getIdentifier(), "0"))
        .thenReturn(Optional.empty());

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setCode("0").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ReleaseMailTokenResponse.newBuilder()
                .setError(ReleaseMailTokenResponse.Error.INVALID_CODE)
                .build());
  }

  @Test
  void releaseMailToken_codeExists_repliesWithMail() {
    long userIdentifier = user.getIdentifier();
    when(mockAccountOperationsInterface.getMailToken(userIdentifier, "0"))
        .thenReturn(Optional.of(new MailToken().setIdentifier(1).setMail("mail@example.com")));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setCode("0").build(), mockStreamObserver);

    verify(mockAccountOperationsInterface).releaseMailToken(1);
    verify(mockStreamObserver)
        .onNext(ReleaseMailTokenResponse.newBuilder().setMail("mail@example.com").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void createKey_userNotActive_repliesUnauthenticated() {
    user.setState(User.State.PENDING);

    administrationService.createKey(CreateKeyRequest.getDefaultInstance(), mockStreamObserver);

    verifyOnErrorUnauthenticated();
  }

  @Test
  void changeMasterKey_digestDoesNotMatchHash_repliesWithError() {
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
    IdentifiedKey identifiedKey = IdentifiedKey.newBuilder().setIdentifier(0L).build();
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockCryptography.computeHash("suffix")).thenReturn("xiffus");
    when(mockAccountOperationsInterface.readSessions(7L))
        .thenReturn(
            ImmutableList.of(new Session().setKey("random"), new Session().setKey("session")));
    when(mockSessionAccessor.getSessionIdentifier()).thenReturn("session");
    when(mockKeyValueClient.createSession(any())).thenReturn("identifier");

    administrationService.changeMasterKey(
        ChangeMasterKeyRequest.newBuilder()
            .setCurrentDigest("digest")
            .setRenewal(
                ChangeMasterKeyRequest.Renewal.newBuilder()
                    .setSalt("prefix")
                    .setDigest("suffix")
                    .addKeys(identifiedKey)
                    .build())
            .build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface)
        .changeMasterKey(7L, "prefix", "xiffus", ImmutableList.of(identifiedKey));
    verify(mockKeyValueClient).dropSessions(ImmutableList.of("random", "session"));
    verify(mockStreamObserver)
        .onNext(ChangeMasterKeyResponse.newBuilder().setSessionKey("identifier").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void acquireMailToken_digestsMismatch_repliesWithError() {
    when(mockCryptography.doesDigestMatchHash("digest", "random")).thenReturn(false);
    administrationService.acquireMailToken(
        AcquireMailTokenRequest.newBuilder().setDigest("random").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            AcquireMailTokenResponse.newBuilder()
                .setError(AcquireMailTokenResponse.Error.INVALID_DIGEST)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void acquireMailToken_digestsMatch_repliesWithDefault() {
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockCryptography.generateUacs()).thenReturn("0");

    administrationService.acquireMailToken(
        AcquireMailTokenRequest.newBuilder().setDigest("digest").setMail("user@mail.com").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).createMailToken(7L, "user@mail.com", "0");
    verify(mockMailClient).sendMailVerificationCode("user@mail.com", "0");
    verify(mockStreamObserver).onNext(AcquireMailTokenResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void changeUsername_digestsMismatch_repliesWithError() {
    when(mockCryptography.doesDigestMatchHash("random", "hash")).thenReturn(false);
    administrationService.changeUsername(
        ChangeUsernameRequest.newBuilder().setDigest("random").build(), mockStreamObserver);

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
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockAccountOperationsInterface.readSessions(7L))
        .thenReturn(ImmutableList.of(new Session().setKey("session")));

    administrationService.deleteAccount(
        DeleteAccountRequest.newBuilder().setDigest("digest").build(), mockStreamObserver);

    verify(mockKeyValueClient).dropSessions(ImmutableList.of("session"));
    verify(mockAccountOperationsInterface).markAccountAsDeleted(7L);
    verify(mockStreamObserver).onNext(DeleteAccountResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void getRecentSessions_returnsOrderedList() {
    Function<Instant, Session> createDatabaseSession =
        instant ->
            new Session()
                .setTimestamp(Timestamp.from(instant))
                .setIpAddress("127.0.0.1")
                .setUserAgent("Chrome/0.0.0");
    when(mockAccountOperationsInterface.readSessions(7L))
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
                    "otpauth://totp/keyring:username?secret=secret&issuer=keyring&algorithm=SHA1&digits=6&period=30")
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

    verify(mockAccountOperationsInterface).acceptOtpParams(1L);
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

  private void verifyOnErrorUnauthenticated() {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }
}
