package keyring.server.main.aspects;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import java.util.Arrays;
import java.util.Optional;
import keyring.server.main.aspects.Annotations.ValidateUser;
import keyring.server.main.entities.User;
import keyring.server.main.interceptors.SessionAccessor;
import keyring.server.main.storage.AccountOperationsInterface;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.DeclarePrecedence;

@Aspect
@DeclarePrecedence("StorageManagerAspect, ValidateUserAspect")
public class ValidateUserAspect {
  private SessionAccessor sessionAccessor;
  private AccountOperationsInterface accountOperationsInterface;

  public void initialize(
      SessionAccessor sessionAccessor, AccountOperationsInterface accountOperationsInterface) {
    this.sessionAccessor = sessionAccessor;
    this.accountOperationsInterface = accountOperationsInterface;
  }

  @Around("@annotation(validateUser) && execution(* *(..))")
  public void executeUserValidation(ValidateUser validateUser, ProceedingJoinPoint joinPoint)
      throws Throwable {
    Optional<User> user =
        accountOperationsInterface.getUserByIdentifier(sessionAccessor.getUserId());
    if (user.isPresent() && Arrays.asList(validateUser.states()).contains(user.get().getState())) {
      joinPoint.proceed();
    } else {
      StreamObserver streamObserver = (StreamObserver) joinPoint.getArgs()[1];
      streamObserver.onError(Status.UNAUTHENTICATED.asException());
    }
  }
}
