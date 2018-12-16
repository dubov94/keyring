package com.floreina.keyring.aspects;

import com.floreina.keyring.aspects.Annotations.EntityController;
import com.floreina.keyring.aspects.Annotations.LocalTransaction;
import com.floreina.keyring.storage.StorageException;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import java.util.logging.Level;
import java.util.logging.Logger;

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
  public EntityManager get(EntityController entityController) {
    return threadLocalEntityManager.get();
  }

  @Around("@annotation(localTransaction) && execution(* *(..))")
  public Object around(LocalTransaction localTransaction, ProceedingJoinPoint proceedingJoinPoint)
      throws Throwable {
    if (threadLocalEntityManager.get() == null) {
      threadLocalEntityManager.set(entityManagerFactory.createEntityManager());
      EntityTransaction entityTransaction = null;
      Object value;
      try {
        entityTransaction = threadLocalEntityManager.get().getTransaction();
        entityTransaction.begin();
        value = proceedingJoinPoint.proceed();
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
      return proceedingJoinPoint.proceed();
    }
  }
}
