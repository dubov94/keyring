package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.aspects.ValidateUserAspect;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionInterceptorKeys;
import com.floreina.keyring.keyvalue.KeyValueClient;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.KeyOperationsInterface;
import com.google.common.collect.ImmutableList;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.Aspects;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdministrationServiceTest {
  @Mock private KeyOperationsInterface mockKeyOperationsInterface;
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private SessionInterceptorKeys mockSessionInterceptorKeys;
  @Mock private KeyValueClient mockKeyValueClient;
  @Mock private StreamObserver mockStreamObserver;
  @Mock private Cryptography mockCryptography;
  @Mock private Post mockPost;

  private User user =
      new User()
          .setIdentifier(0L)
          .setState(User.State.ACTIVE)
          .setDigest("digest");
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(mockSessionInterceptorKeys, mockAccountOperationsInterface);
    administrationService =
        new AdministrationService(
            mockKeyOperationsInterface,
            mockAccountOperationsInterface,
            mockSessionInterceptorKeys,
            mockKeyValueClient,
            mockCryptography,
            mockPost);
    long userIdentifier = user.getIdentifier();
    when(mockSessionInterceptorKeys.getUserIdentifier()).thenReturn(userIdentifier);
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
  void releaseMailToken_codeExists_repliesWithDefault() {
    long userIdentifier = user.getIdentifier();
    when(mockAccountOperationsInterface.getMailToken(userIdentifier, "0"))
        .thenReturn(Optional.of(new MailToken().setIdentifier(1)));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setCode("0").build(), mockStreamObserver);

    verify(mockAccountOperationsInterface).releaseMailToken(1);
    verify(mockStreamObserver).onNext(ReleaseMailTokenResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void createKey_userNotActive_repliesUnauthenticated() {
    user.setState(User.State.PENDING);

    administrationService.createKey(CreateKeyRequest.getDefaultInstance(), mockStreamObserver);

    verifyOnErrorUnauthenticated();
  }

  @Test
  void changeMasterKey_digestsMismatch_repliesWithError() {
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
    when(mockAccountOperationsInterface.readSessions(0L))
        .thenReturn(
            ImmutableList.of(new Session().setKey("random"), new Session().setKey("session")));
    when(mockSessionInterceptorKeys.getSessionIdentifier()).thenReturn("session");

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
        .changeMasterKey(0L, "prefix", "suffix", ImmutableList.of(identifiedKey));
    verify(mockKeyValueClient).dropSessions(ImmutableList.of("random"));
    verify(mockStreamObserver)
        .onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.NONE)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void acquireMailToken_digestsMismatch_repliesWithError() {
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
    when(mockCryptography.generateSecurityCode()).thenReturn("0");

    administrationService.acquireMailToken(
        AcquireMailTokenRequest.newBuilder().setDigest("digest").setMail("user@mail.com").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).createMailToken(0L, "user@mail.com", "0");
    verify(mockPost).sendCode("user@mail.com", "0");
    verify(mockStreamObserver).onNext(AcquireMailTokenResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void changeUsername_digestsMismatch_repliesWithError() {
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
    when(mockAccountOperationsInterface.getUserByName("username")).thenReturn(Optional.empty());

    administrationService.changeUsername(
        ChangeUsernameRequest.newBuilder().setDigest("digest").setUsername("username").build(),
        mockStreamObserver);

    verify(mockAccountOperationsInterface).changeUsername(0L, "username");
    verify(mockStreamObserver).onNext(ChangeUsernameResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  private void verifyOnErrorUnauthenticated() {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }
}
