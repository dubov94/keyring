package com.floreina.keyring.aspects;

import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionKeys;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

import java.util.Optional;

@Aspect
public class ValidateUserAspect {
  private SessionKeys sessionKeys;
  private AccountingInterface accountingInterface;

  public void initialize(SessionKeys sessionKeys, AccountingInterface accountingInterface) {
    this.sessionKeys = sessionKeys;
    this.accountingInterface = accountingInterface;
  }

  @Around("@annotation(validateUser) && execution(* *(..))")
  public void around(ValidateUser validateUser, ProceedingJoinPoint proceedingJoinPoint)
      throws Throwable {
    Optional<User> user = accountingInterface.getUserByIdentifier(sessionKeys.getUserIdentifier());
    if (user.isPresent() && user.get().getState() == validateUser.state()) {
      proceedingJoinPoint.proceed();
    } else {
      StreamObserver streamObserver = (StreamObserver) proceedingJoinPoint.getArgs()[1];
      streamObserver.onError(Status.UNAUTHENTICATED.asException());
    }
  }
}
