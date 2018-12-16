package com.floreina.keyring.aspects;

import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionKeys;
import com.floreina.keyring.storage.AccountOperationsInterface;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

import java.util.Arrays;
import java.util.Optional;

@Aspect
public class ValidateUserAspect {
  private SessionKeys sessionKeys;
  private AccountOperationsInterface accountOperationsInterface;

  public void initialize(
      SessionKeys sessionKeys, AccountOperationsInterface accountOperationsInterface) {
    this.sessionKeys = sessionKeys;
    this.accountOperationsInterface = accountOperationsInterface;
  }

  @Around("@annotation(validateUser) && execution(* *(..))")
  public void around(ValidateUser validateUser, ProceedingJoinPoint proceedingJoinPoint)
      throws Throwable {
    Optional<User> user =
        accountOperationsInterface.getUserByIdentifier(sessionKeys.getUserIdentifier());
    if (user.isPresent()
        && (Arrays.asList(validateUser.states()).contains(ValidateUser.UserState.PENDING)
            || Utilities.isUserActive(user.get()))) {
      proceedingJoinPoint.proceed();
    } else {
      StreamObserver streamObserver = (StreamObserver) proceedingJoinPoint.getArgs()[1];
      streamObserver.onError(Status.UNAUTHENTICATED.asException());
    }
  }
}
