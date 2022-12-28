package keyring.server.main.aspects;

import keyring.server.main.aspects.Annotations.ActivatedSession;
import keyring.server.main.entities.Session;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.DeclarePrecedence;

@Aspect
@DeclarePrecedence("StorageManagerAspect, ActivatedSessionAspect")
public class ActivatedSessionAspect {

  @Before("@annotation(activatedSession) && execution(* *(..))")
  public void executeActivatedSession(ActivatedSession activatedSession, JoinPoint joinPoint)
      throws Throwable {
    Session session = (Session) Reflection.getArgByName(joinPoint, activatedSession.name());
    if (!session.isActivated()) {
      throw new IllegalArgumentException(
          String.format("`Session` %d is not `ACTIVATED`", session.getIdentifier()));
    }
  }
}
