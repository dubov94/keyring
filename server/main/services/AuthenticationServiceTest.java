package server.main.services;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.stub.StreamObserver;
import java.util.Optional;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import server.main.Cryptography;
import server.main.Environment;
import server.main.MailClient;
import server.main.entities.OtpToken;
import server.main.entities.User;
import server.main.interceptors.AgentAccessor;
import server.main.keyvalue.KeyValueClient;
import server.main.proto.service.*;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.KeyOperationsInterface;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private Cryptography mockCryptography;
  @Mock private MailClient mockMailClient;
  @Mock private KeyValueClient mockKeyValueClient;
  @Mock private AgentAccessor mockAgentAccessor;
  @Mock private StreamObserver mockStreamObserver;
  @Mock private Environment mockEnvironment;
  @Mock private IGoogleAuthenticator mockGoogleAuthenticator;

  private AuthenticationService authenticationService;

  @BeforeEach
  void beforeEach() {
    authenticationService =
        new AuthenticationService(
            mockAccountOperationsInterface,
            mockKeyOperationsInterface,
            mockCryptography,
            mockMailClient,
            mockKeyValueClient,
            mockAgentAccessor,
            mockEnvironment,
            mockGoogleAuthenticator);
  }

  @Test
  void register_duplicateUsername_repliesWithError() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(Optional.of(new User()));

    authenticationService.register(
        RegisterRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(RegisterResponse.newBuilder().setError(RegisterResponse.Error.NAME_TAKEN).build());
  }

  @Test
  void register_getsValidRequest_persistsAndSendsMail() {
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());
    when(mockCryptography.computeHash("digest")).thenReturn("hash");
    when(mockCryptography.generateUacs()).thenReturn("0");
    when(mockAccountOperationsInterface.createUser(
            "username", "salt", "hash", "mail@example.com", "0"))
        .thenReturn(new User().setIdentifier(1L));
    when(mockKeyValueClient.createSession(any())).thenReturn("identifier");
    when(mockAgentAccessor.getIpAddress()).thenReturn("127.0.0.1");
    when(mockAgentAccessor.getUserAgent()).thenReturn("Chrome/0.0.0");

    authenticationService.register(
        RegisterRequest.newBuilder()
            .setUsername("username")
            .setSalt("salt")
            .setDigest("digest")
            .setMail("mail@example.com")
            .build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface)
        .createUser("username", "salt", "hash", "mail@example.com", "0");
    verify(mockAccountOperationsInterface)
        .createSession(1L, "identifier", "127.0.0.1", "Chrome/0.0.0");
    verify(mockMailClient).sendMailVerificationCode("mail@example.com", "0");
    verify(mockStreamObserver)
        .onNext(RegisterResponse.newBuilder().setSessionKey("identifier").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void getSalt_invalidUsername_repliesWithError() {
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());

    authenticationService.getSalt(
        GetSaltRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(GetSaltResponse.newBuilder().setError(GetSaltResponse.Error.NOT_FOUND).build());
  }

  @Test
  void getSalt_validUsername_repliesWithAuthenticationSalt() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(new User().setIdentifier(1L).setUsername("username").setSalt("salt")));

    authenticationService.getSalt(
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
                    .setState(User.State.DELETED)
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
    when(mockEnvironment.isProduction()).thenReturn(false);
    when(mockKeyValueClient.createSession(any())).thenReturn("identifier");
    when(mockAgentAccessor.getIpAddress()).thenReturn("127.0.0.1");
    when(mockAgentAccessor.getUserAgent()).thenReturn("Chrome/0.0.0");

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("digest").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface)
        .createSession(1L, "identifier", "127.0.0.1", "Chrome/0.0.0");
    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder()
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey("identifier")
                        .setMailVerificationRequired(true))
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_outOfAttempts_repliesWithError() {
    when(mockKeyValueClient.getUserByAuthn("authn")).thenReturn(Optional.of(1L));
    when(mockAccountOperationsInterface.getUserByIdentifier(1L))
        .thenReturn(Optional.of(new User().setIdentifier(7L)));
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
    when(mockKeyValueClient.getUserByAuthn("authn")).thenReturn(Optional.of(1L));
    when(mockAccountOperationsInterface.getUserByIdentifier(1L))
        .thenReturn(
            Optional.of(
                new User().setIdentifier(7L).setOtpSharedSecret("secret").setOtpSpareAttempts(3)));
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
    when(mockKeyValueClient.getUserByAuthn("authn")).thenReturn(Optional.of(1L));
    when(mockAccountOperationsInterface.getUserByIdentifier(1L))
        .thenReturn(
            Optional.of(
                new User().setIdentifier(1L).setOtpSharedSecret("secret").setOtpSpareAttempts(3)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.of(42));
    when(mockAccountOperationsInterface.acquireOtpSpareAttempt(1L)).thenReturn(Optional.of(2));
    when(mockGoogleAuthenticator.authorize("secret", 42)).thenReturn(true);
    when(mockAgentAccessor.getIpAddress()).thenReturn("127.0.0.1");
    when(mockAgentAccessor.getUserAgent()).thenReturn("Chrome/0.0.0");
    when(mockKeyValueClient.createSession(any())).thenReturn("session");

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockKeyValueClient).dropAuthn("authn");
    verify(mockAccountOperationsInterface)
        .createSession(1L, "session", "127.0.0.1", "Chrome/0.0.0");
    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey("session")
                        .setMailVerificationRequired(true))
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void provideOtp_tokenAbsent_repliesWithError() {
    when(mockKeyValueClient.getUserByAuthn("authn")).thenReturn(Optional.of(1L));
    when(mockAccountOperationsInterface.getUserByIdentifier(1L))
        .thenReturn(Optional.of(new User().setIdentifier(7L).setOtpSpareAttempts(3)));
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
    when(mockKeyValueClient.getUserByAuthn("authn")).thenReturn(Optional.of(1L));
    when(mockAccountOperationsInterface.getUserByIdentifier(1L))
        .thenReturn(Optional.of(new User().setIdentifier(7L)));
    when(mockCryptography.convertTotp("otp")).thenReturn(Optional.empty());
    when(mockAccountOperationsInterface.getOtpToken(1L, "otp", false))
        .thenReturn(Optional.of(new OtpToken().setId(42L)));
    when(mockAgentAccessor.getIpAddress()).thenReturn("127.0.0.1");
    when(mockAgentAccessor.getUserAgent()).thenReturn("Chrome/0.0.0");
    when(mockKeyValueClient.createSession(any())).thenReturn("session");

    authenticationService.provideOtp(
        ProvideOtpRequest.newBuilder().setAuthnKey("authn").setOtp("otp").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).deleteOtpToken(42L);
    verify(mockKeyValueClient).dropAuthn("authn");
    verify(mockAccountOperationsInterface).restoreOtpSpareAttempts(1L);
    verify(mockStreamObserver)
        .onNext(
            ProvideOtpResponse.newBuilder()
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey("session")
                        .setMailVerificationRequired(true))
                .build());
    verify(mockStreamObserver).onCompleted();
  }
}
