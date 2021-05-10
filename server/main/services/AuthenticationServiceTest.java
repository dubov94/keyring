package server.main.services;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import server.main.Cryptography;
import server.main.MailClient;
import server.main.entities.User;
import server.main.interceptors.RequestMetadataInterceptorKeys;
import server.main.keyvalue.KeyValueClient;
import server.main.proto.service.*;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.KeyOperationsInterface;
import io.grpc.stub.StreamObserver;
import java.util.Optional;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private Cryptography mockCryptography;
  @Mock private MailClient mockMailClient;
  @Mock private KeyValueClient mockKeyValueClient;
  @Mock private RequestMetadataInterceptorKeys mockRequestMetadataInterceptorKeys;
  @Mock private StreamObserver mockStreamObserver;

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
            mockRequestMetadataInterceptorKeys);
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
        .thenReturn(new User().setIdentifier(0L));
    when(mockKeyValueClient.createSession(any())).thenReturn("identifier");
    when(mockRequestMetadataInterceptorKeys.getIpAddress()).thenReturn("127.0.0.1");
    when(mockRequestMetadataInterceptorKeys.getUserAgent()).thenReturn("Chrome/0.0.0");

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
        .createSession(0L, "identifier", "127.0.0.1", "Chrome/0.0.0");
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
            Optional.of(new User().setIdentifier(0L).setUsername("username").setSalt("salt")));

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
                    .setIdentifier(0L)
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
                    .setIdentifier(0L)
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
  void logIn_validPair_repliesWithSessionKeyAndState() {
    when(mockAccountOperationsInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(
                new User()
                    .setIdentifier(0L)
                    .setUsername("username")
                    .setSalt("salt")
                    .setHash("hash")));
    when(mockCryptography.computeHash("digest")).thenReturn("hash");
    when(mockKeyValueClient.createSession(any())).thenReturn("identifier");
    when(mockRequestMetadataInterceptorKeys.getIpAddress()).thenReturn("127.0.0.1");
    when(mockRequestMetadataInterceptorKeys.getUserAgent()).thenReturn("Chrome/0.0.0");

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("digest").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface)
        .createSession(0L, "identifier", "127.0.0.1", "Chrome/0.0.0");
    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder()
                .setPayload(
                    LogInResponse.Payload.newBuilder()
                        .setSessionKey("identifier")
                        .setRequiresMailVerification(true)
                        .setKeySet(LogInResponse.Payload.KeySet.getDefaultInstance())
                        .build())
                .setUserData(
                    UserData.newBuilder()
                        .setSessionKey("identifier")
                        .setMailVerificationRequired(true)
                        .build())
                .build());
    verify(mockStreamObserver).onCompleted();
  }
}