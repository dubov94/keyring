package keyring.server.main.aspects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import java.lang.annotation.Annotation;
import java.util.Optional;
import keyring.server.main.aspects.Annotations.ValidateUser;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.interceptors.SessionAccessor;
import keyring.server.main.storage.AccountOperationsInterface;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
class ValidateUserAspectTest {
  @Mock private AccountOperationsInterface mockAccountOperationsInterface;
  @Mock private SessionAccessor mockSessionAccessor;
  @Mock private ProceedingJoinPoint mockProceedingJoinPoint;
  @Mock private StreamObserver mockStreamObserver;

  private ValidateUserAspect validateUserAspect;

  @BeforeEach
  void beforeEach() {
    validateUserAspect = new ValidateUserAspect();
    validateUserAspect.initialize(mockSessionAccessor, mockAccountOperationsInterface);
  }

  @Test
  void executeValidateUser_getsAbsentUser_returnsUnauthenticated() throws Throwable {
    when(mockSessionAccessor.getUserId()).thenReturn(0L);
    when(mockAccountOperationsInterface.getUserById(0L)).thenReturn(Optional.empty());
    when(mockProceedingJoinPoint.getArgs()).thenReturn(new Object[] {null, mockStreamObserver});

    validateUserAspect.executeValidateUser(createValidateUserAnnotation(), mockProceedingJoinPoint);

    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }

  @Test
  void executeValidateUser_getsStatePending_returnsUnauthenticated() throws Throwable {
    when(mockSessionAccessor.getUserId()).thenReturn(0L);
    when(mockAccountOperationsInterface.getUserById(0L))
        .thenReturn(Optional.of(new User().setState(UserState.PENDING)));
    when(mockProceedingJoinPoint.getArgs()).thenReturn(new Object[] {null, mockStreamObserver});

    validateUserAspect.executeValidateUser(createValidateUserAnnotation(), mockProceedingJoinPoint);

    ArgumentCaptor<StatusException> argumentCaptor = ArgumentCaptor.forClass(StatusException.class);
    verify(mockStreamObserver).onError(argumentCaptor.capture());
    assertEquals(Status.UNAUTHENTICATED, argumentCaptor.getValue().getStatus());
  }

  @Test
  void executeValidateUser_getsStateActive_callsJoinPoint() throws Throwable {
    when(mockSessionAccessor.getUserId()).thenReturn(0L);
    when(mockAccountOperationsInterface.getUserById(0L))
        .thenReturn(Optional.of(new User().setState(UserState.ACTIVE)));

    validateUserAspect.executeValidateUser(createValidateUserAnnotation(), mockProceedingJoinPoint);

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
