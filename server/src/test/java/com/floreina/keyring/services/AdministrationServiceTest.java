package com.floreina.keyring.services;

import com.floreina.keyring.aspects.ValidateUserAspect;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.Activation;
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

import java.util.ConcurrentModificationException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdministrationServiceTest {
  @Mock private ManagementInterface mockManagementInterface;
  @Mock private AccountingInterface mockAccountingInterface;
  @Mock private SessionKeys mockSessionKeys;
  @Mock private StreamObserver mockStreamObserver;

  private User user = new User().setIdentifier(0L).setState(User.State.ACTIVE).setDigest("digest");
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(ValidateUserAspect.class).initialize(mockSessionKeys, mockAccountingInterface);
    administrationService =
        new AdministrationService(
            mockManagementInterface, mockAccountingInterface, mockSessionKeys);
    long userIdentifier = user.getIdentifier();
    when(mockSessionKeys.getUserIdentifier()).thenReturn(userIdentifier);
    when(mockAccountingInterface.getUserByIdentifier(userIdentifier))
        .thenAnswer(invocation -> Optional.of(user));
  }

  @Test
  void activate_userAlreadyActive_repliesUnauthenticated() {
    administrationService.activate(ActivateRequest.getDefaultInstance(), mockStreamObserver);

    verifyOnErrorUnauthenticated();
  }

  @Test
  void activate_getActivationEmpty_throwsException() {
    user.setState(User.State.PENDING);
    when(mockAccountingInterface.getActivationByUser(user.getIdentifier()))
        .thenReturn(Optional.empty());

    assertThrows(
        ConcurrentModificationException.class,
        () ->
            administrationService.activate(
                ActivateRequest.getDefaultInstance(), mockStreamObserver));
  }

  @Test
  void activate_codeMismatch_repliesWithError() {
    user.setState(User.State.PENDING);
    when(mockAccountingInterface.getActivationByUser(user.getIdentifier()))
        .thenReturn(Optional.of(new Activation().setCode("0")));

    administrationService.activate(
        ActivateRequest.newBuilder().setCode("X").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ActivateResponse.newBuilder().setError(ActivateResponse.Error.CODE_MISMATCH).build());
  }

  @Test
  void activate_activateUserEmpty_throwsException() {
    user.setState(User.State.PENDING);
    long userIdentifier = user.getIdentifier();
    when(mockAccountingInterface.getActivationByUser(userIdentifier))
        .thenReturn(Optional.of(new Activation().setCode("0")));
    doThrow(IllegalArgumentException.class)
        .when(mockAccountingInterface)
        .activateUser(userIdentifier);

    assertThrows(
        IllegalArgumentException.class,
        () ->
            administrationService.activate(
                ActivateRequest.newBuilder().setCode("0").build(), mockStreamObserver));
  }

  @Test
  void activate_codesMatch_repliesWithDefault() {
    user.setState(User.State.PENDING);
    long userIdentifier = user.getIdentifier();
    when(mockAccountingInterface.getActivationByUser(userIdentifier))
        .thenReturn(Optional.of(new Activation().setCode("0")));

    administrationService.activate(
        ActivateRequest.newBuilder().setCode("0").build(), mockStreamObserver);

    verify(mockAccountingInterface).activateUser(userIdentifier);
    verify(mockStreamObserver).onNext(ActivateResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void createKey_userNotActive_repliesUnauthenticated() {
    user.setState(User.State.PENDING);

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
