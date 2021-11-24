package server.main.aspects;

import java.util.Arrays;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.LockModeType;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
import server.main.aspects.Annotations.LockEntity;
import server.main.storage.StorageException;

@Aspect
public class StorageManagerAspect {
  private static final Logger logger = Logger.getLogger(StorageManagerAspect.class.getName());
  private EntityManagerFactory entityManagerFactory;
  private ThreadLocal<EntityManager> threadLocalEntityManager;

  public void initialize(EntityManagerFactory entityManagerFactory) {
    this.entityManagerFactory = entityManagerFactory;
    threadLocalEntityManager = new ThreadLocal<>();
  }

  @Around("@annotation(entityController) && get(* *)")
  public EntityManager getEntityController(EntityController entityController) {
    return threadLocalEntityManager.get();
  }

  @Around("@annotation(localTransaction) && execution(* *(..))")
  public Object executeLocalTransaction(
      LocalTransaction localTransaction, ProceedingJoinPoint joinPoint) throws Throwable {
    if (threadLocalEntityManager.get() == null) {
      threadLocalEntityManager.set(entityManagerFactory.createEntityManager());
      EntityTransaction entityTransaction = null;
      Object value;
      try {
        entityTransaction = threadLocalEntityManager.get().getTransaction();
        entityTransaction.begin();
        value = joinPoint.proceed();
        entityTransaction.commit();
      } catch (Throwable throwable) {
        try {
          if (entityTransaction != null && entityTransaction.isActive()) {
            entityTransaction.rollback();
          }
        } catch (Throwable exception) {
          logger.log(Level.WARNING, "Unable to rollback", exception);
        }
        throw new StorageException(throwable);
      } finally {
        threadLocalEntityManager.get().close();
        threadLocalEntityManager.remove();
      }
      return value;
    } else {
      return joinPoint.proceed();
    }
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
