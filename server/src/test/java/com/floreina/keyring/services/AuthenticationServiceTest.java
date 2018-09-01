package com.floreina.keyring.services;

import com.floreina.keyring.Cryptography;
import com.floreina.keyring.Post;
import com.floreina.keyring.cache.CacheClient;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.User;
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
  @Mock private AccountingInterface mockAccountingInterface;
  @Mock private ManagementInterface mockManagementInterface;
  @Mock private Cryptography mockCryptography;
  @Mock private Post mockPost;

  @Mock(answer = Answers.RETURNS_MOCKS)
  private CodeHeadRendererFactory mockCodeHeadRendererFactory;

  @Mock(answer = Answers.RETURNS_MOCKS)
  private CodeBodyRendererFactory mockCodeBodyRendererFactory;

  @Mock private CacheClient mockCacheClient;
  @Mock private StreamObserver mockStreamObserver;

  private AuthenticationService authenticationService;

  @BeforeEach
  void beforeEach() {
    authenticationService =
        new AuthenticationService(
            mockAccountingInterface,
            mockManagementInterface,
            mockCryptography,
            mockPost,
            mockCodeHeadRendererFactory,
            mockCodeBodyRendererFactory,
            mockCacheClient);
  }

  @Test
  void register_duplicateUsername_repliesWithError() {
    when(mockAccountingInterface.getUserByName("username")).thenReturn(Optional.of(new User()));

    authenticationService.register(
        RegisterRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(RegisterResponse.newBuilder().setError(RegisterResponse.Error.NAME_TAKEN).build());
  }

  @Test
  void register_getsValidRequest_persistsAndSendsMail() {
    when(mockAccountingInterface.getUserByName("username")).thenReturn(Optional.empty());
    when(mockCryptography.generateSecurityCode()).thenReturn("0");
    when(mockAccountingInterface.createUserWithActivation(
            "username", "salt", "digest", "mail@example.com", "0"))
        .thenReturn(new User().setIdentifier(0L));
    when(mockCacheClient.create(any())).thenReturn(Optional.of("identifier"));

    authenticationService.register(
        RegisterRequest.newBuilder()
            .setUsername("username")
            .setSalt("salt")
            .setDigest("digest")
            .setMail("mail@example.com")
            .build(),
        mockStreamObserver);

    verify(mockAccountingInterface)
        .createUserWithActivation("username", "salt", "digest", "mail@example.com", "0");
    verify(mockPost).send(eq("mail@example.com"), any(), any());
    verify(mockStreamObserver)
        .onNext(RegisterResponse.newBuilder().setSessionKey("identifier").build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void getSalt_invalidUsername_repliesWithError() {
    when(mockAccountingInterface.getUserByName("username")).thenReturn(Optional.empty());

    authenticationService.getSalt(
        GetSaltRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(GetSaltResponse.newBuilder().setError(GetSaltResponse.Error.NOT_FOUND).build());
  }

  @Test
  void getSalt_validUsername_repliesWithAuthenticationSalt() {
    when(mockAccountingInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(new User().setIdentifier(0L).setUsername("username").setSalt("salt")));

    authenticationService.getSalt(
        GetSaltRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver).onNext(GetSaltResponse.newBuilder().setSalt("salt").build());
  }

  @Test
  void logIn_invalidUsername_repliesWithError() {
    when(mockAccountingInterface.getUserByName("username")).thenReturn(Optional.empty());

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void logIn_invalidDigest_repliesWithError() {
    when(mockAccountingInterface.getUserByName("username"))
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
    when(mockAccountingInterface.getUserByName("username"))
        .thenReturn(
            Optional.of(
                new User()
                    .setIdentifier(0L)
                    .setUsername("username")
                    .setDigest("digest")
                    .setState(User.State.PENDING)));
    when(mockCacheClient.create(any())).thenReturn(Optional.of("identifier"));

    authenticationService.logIn(
        LogInRequest.newBuilder().setUsername("username").setDigest("digest").build(),
        mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            LogInResponse.newBuilder()
                .setPayload(
                    LogInResponse.Payload.newBuilder()
                        .setSessionKey("identifier")
                        .setChallenge(LogInResponse.Payload.Challenge.ACTIVATE)
                        .build())
                .build());
    verify(mockStreamObserver).onCompleted();
  }
}
