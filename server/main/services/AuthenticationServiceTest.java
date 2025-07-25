package keyring.server.main.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.paveldubov.turnstile.TurnstileRequest;
import io.paveldubov.turnstile.TurnstileResponse;
import io.paveldubov.turnstile.TurnstileValidator;
import io.vavr.Tuple;
import java.util.Optional;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import keyring.server.main.Cryptography;
import keyring.server.main.MailValidation;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.entities.FeaturePrompts;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.interceptors.AgentAccessor;
import keyring.server.main.interceptors.VersionAccessor;
import keyring.server.main.keyvalue.KeyValueClient;
import keyring.server.main.keyvalue.values.KvAuthn;
import keyring.server.main.keyvalue.values.KvSession;
import keyring.server.main.messagebroker.MessageBrokerClient;
import keyring.server.main.proto.service.GetSaltRequest;
import keyring.server.main.proto.service.GetSaltResponse;
import keyring.server.main.proto.service.LogInRequest;
import keyring.server.main.proto.service.LogInResponse;
import keyring.server.main.proto.service.MailVerification;
import keyring.server.main.proto.service.ProvideOtpRequest;
import keyring.server.main.proto.service.ProvideOtpResponse;
import keyring.server.main.proto.service.RegisterRequest;
import keyring.server.main.proto.service.RegisterResponse;
import keyring.server.main.proto.service.UserData;
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
class AuthenticationServiceTest {
  private static final String IP_ADDRESS = "127.0.0.1";
  private static final String USER_AGENT = "Chrome/0.0.0";
  private static final String VERSION = "version";

  @Mock private EntityManagerFactory mockEntityManagerFactory;
  @Mock private EntityManager mockEntityManager;
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private Cryptography mockCryptography;
  @Mock private MessageBrokerClient mockMessageBrokerClient;
  @Mock private KeyValueClient mockKeyValueClient;
  @Mock private AgentAccessor mockAgentAccessor;
  @Mock private VersionAccessor mockVersionAccessor;
  @Mock private StreamObserver mockStreamObserver;
  @Mock private IGoogleAuthenticator mockGoogleAuthenticator;
  @Mock private TurnstileValidator mockTurnstileValidator;
  @Mock private MailValidation mockMailValidation;

  private AuthenticationService authenticationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(StorageManagerAspect.class).initialize(mockEntityManagerFactory);
    authenticationService =
        new AuthenticationService(
            mockAccountOperationsInterface,
            mockKeyOperationsInterface,
            mockCryptography,
            mockMessageBrokerClient,
            mockKeyValueClient,
            mockAgentAccessor,
            mockVersionAccessor,
            mockGoogleAuthenticator,
            mockTurnstileValidator,
            mockMailValidation);
    when(mockEntityManagerFactory.createEntityManager()).thenReturn(mockEntityManager);
    when(mockAgentAccessor.getIpAddress()).thenReturn(IP_ADDRESS);
    when(mockAgentAccessor.getUserAgent()).thenReturn(USER_AGENT);
    when(mockVersionAccessor.getVersion()).thenReturn(VERSION);
  }

  @Test
  void register_invalidCaptcha_repliesUnauthenticated() {
    when(mockTurnstileValidator.validate(
            TurnstileRequest.newBuilder().setResponse("random").build()))
        .thenReturn(TurnstileResponse.newBuilder().setSuccess(false).build());

    authenticationService.register(
        RegisterRequest.newBuilder().setCaptchaToken("random").build(), mockStreamObserver);

    verifyOnError(Status.UNAUTHENTICATED);
  }

  @Test
  void register_duplicateUsername_repliesWithError() {
    when(mockTurnstileValidator.validate(
            TurnstileRequest.newBuilder().setResponse("captcha").build()))
        .thenReturn(TurnstileResponse.newBuilder().setSuccess(true).build());
    when(mockCryptography.validateA2p("")).thenReturn(true);
    when(mockCryptography.validateDigest("")).thenReturn(true);
    when(mockMailValidation.checkAddress("mail@example.com")).thenReturn(true);
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(Optional.of(new User()));

    authenticationService.register(
        RegisterRequest.newBuilder()
            .setCaptchaToken("captcha")
            .setUsername("username")
            .setMail("mail@example.com")
            .build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(RegisterResponse.newBuilder().setError(RegisterResponse.Error.NAME_TAKEN).build());
  }

  @Test
  void register_getsValidRequest_persistsAndSendsMail() {
    when(mockTurnstileValidator.validate(
            TurnstileRequest.newBuilder().setResponse("captcha").build()))
        .thenReturn(TurnstileResponse.newBuilder().setSuccess(true).build());
    when(mockCryptography.validateA2p("salt")).thenReturn(true);
    when(mockCryptography.validateDigest("digest")).thenReturn(true);
    when(mockMailValidation.checkAddress("mail@example.com")).thenReturn(true);
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());
    when(mockCryptography.computeHash("digest")).thenReturn("hash");
    when(mockCryptography.generateUacs()).thenReturn("0");
    when(mockAccountOperationsInterface.createUser(
            "username", "salt", "hash", IP_ADDRESS, "mail@example.com", "0"))
        .thenReturn(Tuple.of(new User().setIdentifier(1L), new MailToken().setIdentifier(2L)));
    String sessionToken = "token";
    when(mockCryptography.generateTts()).thenReturn(sessionToken);
    when(mockAccountOperationsInterface.createSession(1L, 0L, IP_ADDRESS, USER_AGENT, VERSION))
        .thenReturn(new Session().setIdentifier(3L));
    when(mockKeyValueClient.convertSessionTokenToKey(sessionToken)).thenReturn("key");
    when(mockKeyValueClient.createSession(sessionToken, 1L, IP_ADDRESS, 3L))
        .thenReturn(KvSession.getDefaultInstance());

    authenticationService.register(
        RegisterRequest.newBuilder()
            .setCaptchaToken("captcha")
            .setUsername("username")
            .setSalt("salt")
            .setDigest("digest")
            .setMail("mail@example.com")
            .build(),
        mockStreamObserver);

    verify(mockCryptography).validateA2p("salt");
    verify(mockCryptography).validateDigest("digest");
    verify(mockAccountOperationsInterface)
        .createUser("username", "salt", "hash", IP_ADDRESS, "mail@example.com", "0");
    verify(mockAccountOperationsInterface).createSession(1L, 0L, IP_ADDRESS, USER_AGENT, VERSION);
    verify(mockKeyValueClient).createSession(sessionToken, 1L, IP_ADDRESS, 3L);
    verify(mockAccountOperationsInterface).activateSession(1L, 3L, "key");
    verify(mockMessageBrokerClient).publishMailVc("mail@example.com", "username", "0");
    verify(mockStreamObserver)
        .onNext(
            RegisterResponse.newBuilder().setSessionKey(sessionToken).setMailTokenId(2L).build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void fetchSalt_invalidUsername_repliesWithError() {
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());

    authenticationService.fetchSalt(
        GetSaltRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(GetSaltResponse.newBuilder().setError(GetSaltResponse.Error.NOT_FOUND).build());
  }

  @Test
  void fetchSalt_validUsername_repliesWithAuthenticationSalt() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(new User().setIdentifier(1L).setUsername("username").setSalt("salt")));

    authenticationService.fetchSalt(
        GetSaltRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver).onNext(GetSaltResponse.newBuilder().setSalt("salt").build());
  }

  @Test
  void logIn_invalidUsername_repliesWithError() {
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void logIn_invalidDigest_repliesWithError() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(
                new User()
                    .setIdentifier(1L)
                    .setUsername("username")
                    .setSalt("salt")
                    .setHash("hash")));
    when(mockCryptography.computeHash("mallory")).thenReturn("random");

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("mallory").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void logIn_deletedAccount_repliesWithError() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(
                new User()
                    .setIdentifier(1L)
                    .setState(UserState.USER_DELETED)
                    .setUsername("username")
                    .setSalt("salt")
                    .setHash("hash")));
    when(mockCryptography.computeHash("digest")).thenReturn("hash");

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("digest").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void logIn_validPair_repliesWithUserData() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(
                new User()
                    .setIdentifier(1L)
                    .setUsername("username")
                    .setSalt("salt")
                    .setHash("hash")));
    when(mockCryptography.doesDigestMatchHash("digest", "hash")).thenReturn(true);
    when(mockAccountOperationsInterface.createSession(1L, 0L, IP_ADDRESS, USER_AGENT, VERSION))
        .thenReturn(new Session().setIdentifier(3L));
    String sessionToken = "token";
    when(mockCryptography.generateTts()).thenReturn(sessionToken);
    when(mockKeyValueClient.convertSessionTokenToKey(sessionToken)).thenReturn("key");
    when(mockKeyValueClient.createSession(sessionToken, 1L, IP_ADDRESS, 3L))
        .thenReturn(KvSession.getDefaultInstance());
    when(mockAccountOperationsInterface.getFeaturePrompts(1L)).thenReturn(new FeaturePrompts());
    when(mockAccountOperationsInterface.latestMailToken(1L))
        .thenReturn(Optional.of(new MailToken().setIdentifier(2L)));

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("digest").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).createSession(1L, 0L, IP_ADDRESS, USER_AGENT, VERSION);
    verify(mockKeyValueClient).createSession(sessionToken, 1L, IP_ADDRESS, 3L);
    verify(mockAccountOperationsInterface).activateSession(1L, 3L, "key");
    verify(mockAccountOperationsInterface).getFeaturePrompts(1L);
    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder()
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey(sessionToken)
                        .setMailVerification(
                            MailVerification.newBuilder().setRequired(true).setTokenId(2L)))
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_outOfAttempts_repliesWithError() {
    when(mockKeyValueClient.getKvAuthn("authn", IP_ADDRESS))
        .thenReturn(Optional.of(KvAuthn.newBuilder().setUserId(1L).build()));
    when(mockAccountOperationsInterface.getUserById(1L))
        .thenReturn(Optional.of(new User().setIdentifier(1L)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.of(42));
    when(mockAccountOperationsInterface.acquireOtpSpareAttempt(1L)).thenReturn(Optional.empty());

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setError(ProvideOtpResponse.Error.ATTEMPTS_EXHAUSTED)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_otpUnauthorized_repliesWithError() {
    when(mockKeyValueClient.getKvAuthn("authn", IP_ADDRESS))
        .thenReturn(Optional.of(KvAuthn.newBuilder().setUserId(1L).build()));
    when(mockAccountOperationsInterface.getUserById(1L))
        .thenReturn(
            Optional.of(
                new User().setIdentifier(1L).setOtpSharedSecret("secret").setOtpSpareAttempts(3)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.of(42));
    when(mockAccountOperationsInterface.acquireOtpSpareAttempt(1L)).thenReturn(Optional.of(2));
    when(mockGoogleAuthenticator.authorize("secret", 42)).thenReturn(false);

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setError(ProvideOtpResponse.Error.INVALID_CODE)
                .setAttemptsLeft(2)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_otpAuthorized_repliesWithUserData() {
    when(mockKeyValueClient.getKvAuthn("authn", IP_ADDRESS))
        .thenReturn(Optional.of(KvAuthn.newBuilder().setUserId(1L).setSessionEntityId(3L).build()));
    when(mockAccountOperationsInterface.getUserById(1L))
        .thenReturn(
            Optional.of(
                new User().setIdentifier(1L).setOtpSharedSecret("secret").setOtpSpareAttempts(3)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.of(42));
    when(mockAccountOperationsInterface.acquireOtpSpareAttempt(1L)).thenReturn(Optional.of(2));
    when(mockGoogleAuthenticator.authorize("secret", 42)).thenReturn(true);
    when(mockCryptography.generateTts()).thenReturn("token");
    when(mockAgentAccessor.getIpAddress()).thenReturn(IP_ADDRESS);
    when(mockKeyValueClient.convertSessionTokenToKey("token")).thenReturn("key");
    when(mockKeyValueClient.createSession("token", 1L, IP_ADDRESS, 3L))
        .thenReturn(KvSession.getDefaultInstance());
    when(mockAccountOperationsInterface.getFeaturePrompts(1L)).thenReturn(new FeaturePrompts());
    when(mockAccountOperationsInterface.latestMailToken(1L))
        .thenReturn(Optional.of(new MailToken().setIdentifier(2L)));

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockKeyValueClient).deleteAuthn("authn");
    verify(mockAccountOperationsInterface).restoreOtpSpareAttempts(1L);
    verify(mockKeyValueClient).createSession("token", 1L, IP_ADDRESS, 3L);
    verify(mockAccountOperationsInterface).activateSession(1L, 3L, "key");
    verify(mockAccountOperationsInterface).getFeaturePrompts(1L);
    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey("token")
                        .setMailVerification(
                            MailVerification.newBuilder().setRequired(true).setTokenId(2L)))
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_tokenAbsent_repliesWithError() {
    when(mockKeyValueClient.getKvAuthn("authn", IP_ADDRESS))
        .thenReturn(Optional.of(KvAuthn.newBuilder().setUserId(1L).build()));
    when(mockAccountOperationsInterface.getUserById(1L))
        .thenReturn(Optional.of(new User().setIdentifier(1L).setOtpSpareAttempts(3)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.empty());
    when(mockAccountOperationsInterface.getOtpToken(1L, "otp", false)).thenReturn(Optional.empty());

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setError(ProvideOtpResponse.Error.INVALID_CODE)
                .setAttemptsLeft(3)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_tokenPresent_deletesAndReplies() {
    when(mockKeyValueClient.getKvAuthn("authn", IP_ADDRESS))
        .thenReturn(Optional.of(KvAuthn.newBuilder().setUserId(1L).setSessionEntityId(3L).build()));
    when(mockAccountOperationsInterface.getUserById(1L))
        .thenReturn(Optional.of(new User().setIdentifier(1L)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.empty());
    when(mockAccountOperationsInterface.getOtpToken(1L, "otp", false))
        .thenReturn(Optional.of(new OtpToken().setId(42L)));
    when(mockCryptography.generateTts()).thenReturn("token");
    when(mockAgentAccessor.getIpAddress()).thenReturn(IP_ADDRESS);
    when(mockKeyValueClient.convertSessionTokenToKey("token")).thenReturn("key");
    when(mockKeyValueClient.createSession("token", 1L, IP_ADDRESS, 3L))
        .thenReturn(KvSession.getDefaultInstance());
    when(mockAccountOperationsInterface.getFeaturePrompts(1L)).thenReturn(new FeaturePrompts());
    when(mockAccountOperationsInterface.latestMailToken(1L))
        .thenReturn(Optional.of(new MailToken().setIdentifier(97L)));

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).deleteOtpToken(1L, 42L);
    verify(mockKeyValueClient).deleteAuthn("authn");
    verify(mockAccountOperationsInterface).restoreOtpSpareAttempts(1L);
    verify(mockKeyValueClient).createSession("token", 1L, IP_ADDRESS, 3L);
    verify(mockAccountOperationsInterface).activateSession(1L, 3L, "key");
    verify(mockAccountOperationsInterface).getFeaturePrompts(1L);
    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey("token")
                        .setMailVerification(
                            MailVerification.newBuilder().setRequired(true).setTokenId(97L)))
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  private void verifyOnError(Status status) {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(status, argumentCaptor.getValue().getStatus());
  }
}
