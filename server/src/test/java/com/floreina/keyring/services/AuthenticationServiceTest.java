package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.UserMetadataKeys;
import com.floreina.keyring.sessions.SessionClient;
import com.floreina.keyring.sessions.UserCast;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.KeyOperationsInterface;
import com.floreina.keyring.templates.CodeBodyRendererFactory;
import com.floreina.keyring.templates.CodeHeadRendererFactory;
import io.grpc.stub.StreamObserver;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private Cryptography mockCryptography;
  @Mock private Post mockPost;

  @Mock(answer = Answers.RETURNS_MOCKS)
  private CodeHeadRendererFactory mockCodeHeadRendererFactory;

  @Mock(answer = Answers.RETURNS_MOCKS)
  private CodeBodyRendererFactory mockCodeBodyRendererFactory;

  @Mock private SessionClient mockSessionClient;
  @Mock private UserMetadataKeys mockUserMetadataKeys;
  @Mock private StreamObserver mockStreamObserver;

  private AuthenticationService authenticationService;

  @BeforeEach
  void beforeEach() {
    authenticationService =
        new AuthenticationService(
            mockAccountOperationsInterface,
            mockKeyOperationsInterface,
            mockCryptography,
            mockPost,
            mockCodeHeadRendererFactory,
            mockCodeBodyRendererFactory,
            mockSessionClient,
            mockUserMetadataKeys);
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
    when(mockCryptography.generateSecurityCode()).thenReturn("0");
    when(mockAccountOperationsInterface.createUser(
            "username", "salt", "digest", "mail@example.com", "0"))
        .thenReturn(new User().setIdentifier(0L));
    when(mockSessionClient.create(any())).thenReturn(Optional.of("identifier"));
    when(mockUserMetadataKeys.getIpAddress()).thenReturn("127.0.0.1");
    when(mockUserMetadataKeys.getUserAgent()).thenReturn("Chrome/0.0.0");

    authenticationService.register(
        RegisterRequest.newBuilder()
            .setUsername("username")
            .setSalt("salt")
            .setDigest("digest")
            .setMail("mail@example.com")
            .build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface)
        .createUser("username", "salt", "digest", "mail@example.com", "0");
    verify(mockAccountOperationsInterface)
        .createSession(0L, "identifier", "127.0.0.1", "Chrome/0.0.0");
    verify(mockPost).send(eq("mail@example.com"), any(), any());
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
            Optional.of(new User().setIdentifier(0L).setUsername("username").setDigest("digest")));

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("mallory").build(),
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
            Optional.of(new User().setIdentifier(0L).setUsername("username").setDigest("digest")));
    when(mockSessionClient.create(any())).thenReturn(Optional.of("identifier"));
    when(mockUserMetadataKeys.getIpAddress()).thenReturn("127.0.0.1");
    when(mockUserMetadataKeys.getUserAgent()).thenReturn("Chrome/0.0.0");

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
                        .addRequirements(LogInResponse.Payload.Requirement.MAIL)
                        .build())
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void keepAlive_invalidSessionKey_repliesWithError() {
    when(mockSessionClient.readAndUpdateExpirationTime("identifier")).thenReturn(Optional.empty());

    authenticationService.keepAlive(
        KeepAliveRequest.newBuilder().setSessionKey("identifier").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            KeepAliveResponse.newBuilder().setError(KeepAliveResponse.Error.INVALID_KEY).build());
  }

  @Test
  void keepAlive_validSessionKey_repliesWithDefault() {
    when(mockSessionClient.readAndUpdateExpirationTime("identifier"))
        .thenReturn(Optional.of(new UserCast().setIdentifier(0L)));

    authenticationService.keepAlive(
        KeepAliveRequest.newBuilder().setSessionKey("identifier").build(), mockStreamObserver);

    verify(mockStreamObserver).onNext(KeepAliveResponse.getDefaultInstance());
  }
}
