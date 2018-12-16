package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.aspects.ValidateUserAspect;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionKeys;
import com.floreina.keyring.sessions.SessionClient;
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
  @Mock private SessionKeys mockSessionKeys;
  @Mock private SessionClient mockSessionClient;
  @Mock private StreamObserver mockStreamObserver;
  @Mock private Cryptography mockCryptography;
  @Mock private Post mockPost;

  private User user = new User().setIdentifier(0L).setDigest("digest").setMail("mail@domain.com");
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(mockSessionKeys, mockAccountOperationsInterface);
    administrationService =
        new AdministrationService(
            mockKeyOperationsInterface,
            mockAccountOperationsInterface,
            mockSessionKeys,
            mockSessionClient,
            mockCryptography,
            mockPost);
    long userIdentifier = user.getIdentifier();
    when(mockSessionKeys.getUserIdentifier()).thenReturn(userIdentifier);
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
    user.setMail(null);

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
    when(mockSessionKeys.getSessionIdentifier()).thenReturn("session");

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
    verify(mockSessionClient).drop(ImmutableList.of("random"));
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

  private void verifyOnErrorUnauthenticated() {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }
}
