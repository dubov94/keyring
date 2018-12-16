package com.floreina.keyring.aspects;

import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionInterceptorKeys;
import com.floreina.keyring.storage.AccountOperationsInterface;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;

import java.lang.annotation.Annotation;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ValidateUserAspectTest {
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private SessionInterceptorKeys mockSessionInterceptorKeys;
  @Mock private ProceedingJoinPoint mockProceedingJoinPoint;
  @Mock private StreamObserver mockStreamObserver;

  private ValidateUserAspect validateUserAspect;

  @BeforeEach
  void beforeEach() {
    validateUserAspect = new ValidateUserAspect();
    validateUserAspect.initialize(mockSessionInterceptorKeys, mockAccountOperationsInterface);
  }

  @Test
  void around_getsAbsentUser_returnsUnauthenticated() throws Throwable {
    when(mockSessionInterceptorKeys.getUserIdentifier()).thenReturn(0L);
    when(mockAccountOperationsInterface.getUserByIdentifier(0L)).thenReturn(Optional.empty());
    when(mockProceedingJoinPoint.getArgs()).thenReturn(new Object[] {null, mockStreamObserver});

    validateUserAspect.around(createValidateUserAnnotation(), mockProceedingJoinPoint);

    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }

  @Test
  void around_getsUserWithNoMail_returnsUnauthenticated() throws Throwable {
    when(mockSessionInterceptorKeys.getUserIdentifier()).thenReturn(0L);
    when(mockAccountOperationsInterface.getUserByIdentifier(0L))
        .thenReturn(Optional.of(new User()));
    when(mockProceedingJoinPoint.getArgs()).thenReturn(new Object[] {null, mockStreamObserver});

    validateUserAspect.around(createValidateUserAnnotation(), mockProceedingJoinPoint);

    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }

  @Test
  void around_getsUserWithMail_callsJoinPoint() throws Throwable {
    when(mockSessionInterceptorKeys.getUserIdentifier()).thenReturn(0L);
    when(mockAccountOperationsInterface.getUserByIdentifier(0L))
        .thenReturn(Optional.of(new User().setMail("mail@domain.com")));

    validateUserAspect.around(createValidateUserAnnotation(), mockProceedingJoinPoint);

    verify(mockProceedingJoinPoint).proceed();
  }

  private ValidateUser createValidateUserAnnotation() {
    return new ValidateUser() {
      @Override
      public Class<? extends Annotation> annotationType() {
        return ValidateUser.class;
      }

      @Override
      public UserState[] states() {
        return new UserState[] {UserState.ACTIVE};
      }
    };
  }
}
