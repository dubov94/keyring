package com.floreina.keyring.services;

import com.floreina.keyring.ActivateRequest;
import com.floreina.keyring.ActivateResponse;
import com.floreina.keyring.CreateKeyRequest;
import com.floreina.keyring.aspects.ValidateUserAspect;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.Activation;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionKeys;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdministrationServiceTest {
  private static long USER_IDENTIFIER = 0L;
  @Mock private ManagementInterface mockManagementInterface;
  @Mock private AccountingInterface mockAccountingInterface;
  @Mock private SessionKeys mockSessionKeys;
  @Mock private StreamObserver mockStreamObserver;

  private User.State state;
  private AdministrationService administrationService;

  @BeforeEach
  void beforeEach() {
    Aspects.aspectOf(ValidateUserAspect.class).initialize(mockSessionKeys, mockAccountingInterface);
    administrationService =
        new AdministrationService(
            mockManagementInterface, mockAccountingInterface, mockSessionKeys);
    when(mockSessionKeys.getUserIdentifier()).thenReturn(USER_IDENTIFIER);
    when(mockAccountingInterface.getUserByIdentifier(USER_IDENTIFIER))
        .thenAnswer(
            invocation -> Optional.of(new User().setIdentifier(USER_IDENTIFIER).setState(state)));
  }

  @Test
  void activate_userAlreadyActive_repliesUnauthenticated() {
    state = User.State.ACTIVE;

    administrationService.activate(ActivateRequest.getDefaultInstance(), mockStreamObserver);

    verifyOnErrorUnauthenticated();
  }

  @Test
  void activate_getActivationEmpty_throwsException() {
    state = User.State.PENDING;
    when(mockAccountingInterface.getActivationByUser(USER_IDENTIFIER)).thenReturn(Optional.empty());

    assertThrows(
        ConcurrentModificationException.class,
        () ->
            administrationService.activate(
                ActivateRequest.getDefaultInstance(), mockStreamObserver));
  }

  @Test
  void activate_codeMismatch_repliesWithError() {
    state = User.State.PENDING;
    when(mockAccountingInterface.getActivationByUser(USER_IDENTIFIER))
        .thenReturn(Optional.of(new Activation().setCode("0")));

    administrationService.activate(
        ActivateRequest.newBuilder().setCode("X").build(), mockStreamObserver);

    verify(mockStreamObserver)
        .onNext(
            ActivateResponse.newBuilder().setError(ActivateResponse.Error.CODE_MISMATCH).build());
  }

  @Test
  void activate_activateUserEmpty_throwsException() {
    state = User.State.PENDING;
    when(mockAccountingInterface.getActivationByUser(USER_IDENTIFIER))
        .thenReturn(Optional.of(new Activation().setCode("0")));
    when(mockAccountingInterface.activateUser(USER_IDENTIFIER)).thenReturn(Optional.empty());

    assertThrows(
        ConcurrentModificationException.class,
        () ->
            administrationService.activate(
                ActivateRequest.newBuilder().setCode("0").build(), mockStreamObserver));
  }

  @Test
  void activate_codesMatch_repliesWithDefault() {
    state = User.State.PENDING;
    when(mockAccountingInterface.getActivationByUser(USER_IDENTIFIER))
        .thenReturn(Optional.of(new Activation().setCode("0")));
    when(mockAccountingInterface.activateUser(USER_IDENTIFIER))
        .thenReturn(
            Optional.of(new User().setIdentifier(USER_IDENTIFIER).setState(User.State.PENDING)));

    administrationService.activate(
        ActivateRequest.newBuilder().setCode("0").build(), mockStreamObserver);

    verify(mockStreamObserver).onNext(ActivateResponse.getDefaultInstance());
    verify(mockStreamObserver).onCompleted();
  }

  @Test
  void createKey_userNotActive_repliesUnauthenticated() {
    state = User.State.PENDING;

    administrationService.createKey(CreateKeyRequest.getDefaultInstance(), mockStreamObserver);

    verifyOnErrorUnauthenticated();
  }

  private void verifyOnErrorUnauthenticated() {
    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }
}
