package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.aspects.ValidateUserAspect;
import com.floreina.keyring.cache.CacheClient;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionKeys;
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
  @Mock private ManagementInterface mockManagementInterface;
  @Mock private AccountingInterface mockAccountingInterface;
  @Mock private SessionKeys mockSessionKeys;
  @Mock private CacheClient mockCacheClient;
  @Mock private StreamObserver mockStreamObserver;

  private User user = new User().setIdentifier(0L).setDigest("digest").setMail("mail@domain.com");
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(ValidateUserAspect.class).initialize(mockSessionKeys, mockAccountingInterface);
    administrationService =
        new AdministrationService(
            mockManagementInterface, mockAccountingInterface, mockSessionKeys, mockCacheClient);
    long userIdentifier = user.getIdentifier();
    when(mockSessionKeys.getUserIdentifier()).thenReturn(userIdentifier);
    when(mockAccountingInterface.getUserByIdentifier(userIdentifier))
        .thenAnswer(invocation -> Optional.of(user));
  }

  @Test
  void releaseMailToken_codeDoesNotExist_repliesWithError() {
    when(mockAccountingInterface.getMailToken(user.getIdentifier(), "0"))
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
    when(mockAccountingInterface.getMailToken(userIdentifier, "0"))
        .thenReturn(Optional.of(new MailToken().setIdentifier(1)));

    administrationService.releaseMailToken(
        ReleaseMailTokenRequest.newBuilder().setCode("0").build(), mockStreamObserver);

    verify(mockAccountingInterface).releaseMailToken(1);
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
  void changeMasterKey_digestMismatch_repliesWithError() {
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
  void changeMasterKey_digestsMatch() {
    IdentifiedKey identifiedKey = IdentifiedKey.newBuilder().setIdentifier(0L).build();
    when(mockAccountingInterface.readSessions(0L))
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

    verify(mockAccountingInterface)
        .changeMasterKey(0L, "prefix", "suffix", ImmutableList.of(identifiedKey));
    verify(mockCacheClient).drop(ImmutableList.of("random"));
    verify(mockStreamObserver)
        .onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.NONE)
                .build());
    verify(mockStreamObserver).onCompleted();
  }

  private void verifyOnErrorUnauthenticated() {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }
}
