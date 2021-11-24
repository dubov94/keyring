package server.main.aspects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import java.lang.annotation.Annotation;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.LockModeType;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import server.main.aspects.Annotations.LockEntity;
import server.main.entities.User;
import server.main.storage.StorageException;

@ExtendWith(MockitoExtension.class)
class StorageManagerAspectTest {
  @Mock private EntityManagerFactory mockEntityManagerFactory;
  @Mock private EntityManager mockEntityManager;
  @Mock private EntityTransaction mockEntityTransaction;
  @Mock private ProceedingJoinPoint mockLocalTransactionJoinPoint;
  @Mock private JoinPoint mockLockEntityJoinPoint;
  @Mock private MethodSignature mockLockEntityMethodSignature;

  private StorageManagerAspect storageManagerAspect;

  @BeforeEach
  void beforeEach() {
    storageManagerAspect = new StorageManagerAspect();
    storageManagerAspect.initialize(mockEntityManagerFactory);
    when(mockEntityManagerFactory.createEntityManager()).thenReturn(mockEntityManager);
    when(mockEntityManager.getTransaction()).thenReturn(mockEntityTransaction);
    when(mockLockEntityJoinPoint.getSignature()).thenReturn(mockLockEntityMethodSignature);
  }

  @Test
  void getEntityController_oneThreadSetsEntityManager_anotherThreadSeesNull() throws Throwable {
    when(mockLocalTransactionJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(mockEntityManager, storageManagerAspect.getEntityController(null));
              Thread thread =
                  new Thread(
                      () -> assertEquals(null, storageManagerAspect.getEntityController(null)));
              thread.start();
              thread.join();
              return null;
            });

    storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint);

    verify(mockLocalTransactionJoinPoint).proceed();
  }

  @Test
  void getEntityController_recursiveLocalTransaction_usesSameEntityManager() throws Throwable {
    ProceedingJoinPoint mockAnotherJoinPoint = mock(ProceedingJoinPoint.class);
    when(mockAnotherJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(mockEntityManager, storageManagerAspect.getEntityController(null));
              return null;
            });
    when(mockLocalTransactionJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(mockEntityManager, storageManagerAspect.getEntityController(null));
              storageManagerAspect.executeLocalTransaction(null, mockAnotherJoinPoint);
              return null;
            });

    storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint);

    verify(mockLocalTransactionJoinPoint).proceed();
  }

  @Test
  void executeLocalTransaction_joinPointThrows_rollbacksClosesAndRemovesReference()
      throws Throwable {
    when(mockLocalTransactionJoinPoint.proceed()).thenThrow(new RuntimeException());
    when(mockEntityTransaction.isActive()).thenReturn(true);

    assertThrows(
        StorageException.class,
        () -> storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint));

    verify(mockEntityTransaction).rollback();
    verify(mockEntityManager).close();
    assertEquals(null, storageManagerAspect.getEntityController(null));
  }

  @Test
  void executeLocalTransaction_getTransactionThrows_noRollback() throws Throwable {
    when(mockEntityManager.getTransaction()).thenThrow(new RuntimeException());

    assertThrows(
        StorageException.class,
        () -> storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint));
  }

  @Test
  void executeLocalTransaction_inactiveTransactionThrows_noRollback() throws Throwable {
    doThrow(new RuntimeException()).when(mockEntityTransaction).begin();
    when(mockEntityTransaction.isActive()).thenReturn(false);

    assertThrows(
        StorageException.class,
        () -> storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint));

    verify(mockEntityTransaction, never()).rollback();
  }

  @Test
  void executeLocalTransaction_isActiveThrows_databaseExceptionThrown() throws Throwable {
    doThrow(new RuntimeException()).when(mockEntityTransaction).begin();
    when(mockEntityTransaction.isActive()).thenThrow(new RuntimeException());

    assertThrows(
        StorageException.class,
        () -> storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint));
  }

  @Test
  void executeLocalTransaction_rollbackThrows_databaseExceptionThrown() throws Throwable {
    doThrow(new RuntimeException()).when(mockEntityTransaction).commit();
    when(mockEntityTransaction.isActive()).thenReturn(true);
    doThrow(new RuntimeException()).when(mockEntityTransaction).rollback();

    assertThrows(
        StorageException.class,
        () -> storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint));
  }

  @Test
  void executeLocalTransaction_joinPointReturnsValue_propagatesValueBack() throws Throwable {
    when(mockLocalTransactionJoinPoint.proceed()).thenReturn(0);

    assertEquals(
        0, storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint));
  }

  @Test
  void executeLockEntity_locksMatchingArgument() throws Throwable {
    User user = new User().setUsername("username");
    when(mockLockEntityMethodSignature.getParameterNames())
        .thenReturn(new String[] {"abc", "argument", "xyz"});
    when(mockLockEntityJoinPoint.getArgs()).thenReturn(new Object[] {null, user, null});
    when(mockLocalTransactionJoinPoint.proceed())
        .then(
            (Void) -> {
              storageManagerAspect.executeLockEntity(
                  createLockEntityAnnotation(), mockLockEntityJoinPoint);
              return null;
            });

    storageManagerAspect.executeLocalTransaction(null, mockLocalTransactionJoinPoint);

    verify(mockLocalTransactionJoinPoint).proceed();
    verify(mockEntityManager).lock(user, LockModeType.OPTIMISTIC_FORCE_INCREMENT);
  }

  private LockEntity createLockEntityAnnotation() {
    return new LockEntity() {
      @Override
      public Class<? extends Annotation> annotationType() {
        return LockEntity.class;
      }

      @Override
      public String name() {
        return "argument";
      }
    };
  }
}
