package keyring.server.main.aspects;

import com.google.common.base.Preconditions;
import java.util.Arrays;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.LockModeType;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.LockEntity;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.storage.StorageException;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;

@Aspect
public class StorageManagerAspect {
  private static final Logger logger = Logger.getLogger(StorageManagerAspect.class.getName());
  private EntityManagerFactory entityManagerFactory;
  private ThreadLocal<EntityManager> threadLocalEntityManager;
  private ThreadLocal<EntityTransaction> threadLocalEntityTransaction;

  // https://www.eclipse.org/aspectj/doc/next/progguide/semantics-advice.html > Advice precedence
  public void initialize(EntityManagerFactory entityManagerFactory) {
    this.entityManagerFactory = entityManagerFactory;
    threadLocalEntityManager = new ThreadLocal<>();
    threadLocalEntityTransaction = new ThreadLocal<>();
  }

  @Around("@annotation(contextualEntityManager) && get(* *)")
  public EntityManager getContextualEntityManager(ContextualEntityManager contextualEntityManager) {
    return threadLocalEntityManager.get();
  }

  @Around("@annotation(withEntityManager) && execution(* *(..))")
  public Object executeWithEntityManager(
      WithEntityManager withEntityManager, ProceedingJoinPoint joinPoint) throws Throwable {
    if (threadLocalEntityManager.get() != null) {
      return joinPoint.proceed();
    }
    EntityManager entityManager = entityManagerFactory.createEntityManager();
    threadLocalEntityManager.set(entityManager);
    try {
      return joinPoint.proceed();
    } finally {
      entityManager.close();
      threadLocalEntityManager.remove();
    }
  }

  @Around("@annotation(withEntityTransaction) && execution(* *(..))")
  public Object executeWithEntityTransaction(
      WithEntityTransaction withEntityTransaction, ProceedingJoinPoint joinPoint) throws Throwable {
    if (threadLocalEntityTransaction.get() != null) {
      return joinPoint.proceed();
    }

    EntityManager entityManager = threadLocalEntityManager.get();
    Preconditions.checkNotNull(entityManager);
    EntityTransaction entityTransaction = entityManager.getTransaction();
    threadLocalEntityTransaction.set(entityTransaction);

    Object value;
    try {
      entityTransaction.begin();
      value = joinPoint.proceed();
      entityTransaction.commit();
    } catch (Throwable throwable) {
      try {
        if (entityTransaction.isActive()) {
          entityTransaction.rollback();
        }
      } catch (Throwable exception) {
        logger.log(Level.WARNING, "Unable to rollback", exception);
      }
      throw new StorageException(throwable);
    } finally {
      threadLocalEntityTransaction.remove();
    }
    return value;
  }

  @Before("@annotation(lockEntity) && execution(* *(..))")
  public void executeLockEntity(LockEntity lockEntity, JoinPoint joinPoint) throws Throwable {
    MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
    List<String> parameterNames = Arrays.asList(methodSignature.getParameterNames());
    String name = lockEntity.name();
    int index = parameterNames.indexOf(name);
    if (index == -1) {
      throw new IllegalStateException(String.format("Parameter `%s` does not exist", name));
    }
    threadLocalEntityManager
        .get()
        .lock(joinPoint.getArgs()[index], LockModeType.OPTIMISTIC_FORCE_INCREMENT);
  }
}
