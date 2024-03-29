package keyring.server.main.aspects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.annotation.Annotation;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.LockModeType;
import keyring.server.main.aspects.Annotations.LockEntity;
import keyring.server.main.entities.User;
import keyring.server.main.storage.StorageException;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
class StorageManagerAspectTest {
  @Mock private EntityManagerFactory mockEntityManagerFactory;
  @Mock private EntityManager mockEntityManager;
  @Mock private EntityTransaction mockEntityTransaction;
  @Mock private ProceedingJoinPoint mockManagerJoinPoint;
  @Mock private ProceedingJoinPoint mockTransactionJoinPoint;
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
  void getContextualEntityManager_oneThreadSetsEntityManager_anotherThreadSeesNull()
      throws Throwable {
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(
                  mockEntityManager, storageManagerAspect.getContextualEntityManager(null));
              Thread thread =
                  new Thread(
                      () ->
                          assertEquals(
                              null, storageManagerAspect.getContextualEntityManager(null)));
              thread.start();
              thread.join();
              return null;
            });

    storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint);

    verify(mockManagerJoinPoint).proceed();
  }

  @Test
  void getContextualEntityManager_recursiveWithEntityManager_usesSameEntityManager()
      throws Throwable {
    ProceedingJoinPoint mockAnotherJoinPoint = mock(ProceedingJoinPoint.class);
    when(mockAnotherJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(
                  mockEntityManager, storageManagerAspect.getContextualEntityManager(null));
              return null;
            });
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(
                  mockEntityManager, storageManagerAspect.getContextualEntityManager(null));
              storageManagerAspect.executeWithEntityManager(null, mockAnotherJoinPoint);
              return null;
            });

    storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint);

    verify(mockManagerJoinPoint).proceed();
  }

  @Test
  void executeWithEntityManager_joinPointThrows_closesRemovesReference() throws Throwable {
    when(mockManagerJoinPoint.proceed()).thenThrow(new RuntimeException("`JoinPoint` threw"));

    RuntimeException exception =
        assertThrows(
            RuntimeException.class,
            () -> storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint));

    assertEquals("`JoinPoint` threw", exception.getMessage());
    verify(mockEntityManager).close();
    assertEquals(null, storageManagerAspect.getContextualEntityManager(null));
  }

  @Test
  void executeWithEntityTransaction_inactiveTransactionThrows_noRollback() throws Throwable {
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              storageManagerAspect.executeWithEntityTransaction(null, mockTransactionJoinPoint);
              return null;
            });
    doThrow(new RuntimeException("Unable to begin")).when(mockEntityTransaction).begin();
    when(mockEntityTransaction.isActive()).thenReturn(false);

    StorageException exception =
        assertThrows(
            StorageException.class,
            () -> storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint));

    assertEquals("java.lang.RuntimeException: Unable to begin", exception.getMessage());
    verify(mockEntityTransaction, never()).rollback();
  }

  @Test
  void executeWithEntityTransaction_isActiveThrows_databaseExceptionThrown() throws Throwable {
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              storageManagerAspect.executeWithEntityTransaction(null, mockTransactionJoinPoint);
              return null;
            });
    doThrow(new RuntimeException("Unable to begin")).when(mockEntityTransaction).begin();
    when(mockEntityTransaction.isActive()).thenThrow(new RuntimeException());

    StorageException exception =
        assertThrows(
            StorageException.class,
            () -> storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint));

    assertEquals("java.lang.RuntimeException: Unable to begin", exception.getMessage());
  }

  @Test
  void executeWithEntityTransaction_rollbackThrows_databaseExceptionThrown() throws Throwable {
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              storageManagerAspect.executeWithEntityTransaction(null, mockTransactionJoinPoint);
              return null;
            });
    when(mockTransactionJoinPoint.proceed()).thenReturn(null);
    doThrow(new RuntimeException("Unable to commit")).when(mockEntityTransaction).commit();
    when(mockEntityTransaction.isActive()).thenReturn(true);
    doThrow(new RuntimeException("Unable to roll back")).when(mockEntityTransaction).rollback();

    StorageException exception =
        assertThrows(
            StorageException.class,
            () -> storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint));

    assertEquals("java.lang.RuntimeException: Unable to commit", exception.getMessage());
  }

  @Test
  void executeWithEntityTransaction_joinPointReturnsValue_propagatesValueBack() throws Throwable {
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(
                  0,
                  storageManagerAspect.executeWithEntityTransaction(
                      null, mockTransactionJoinPoint));
              return null;
            });
    when(mockTransactionJoinPoint.proceed()).thenReturn(0);

    storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint);

    verify(mockEntityTransaction).begin();
    verify(mockEntityTransaction).commit();
  }

  @Test
  void executeLockEntity_locksMatchingArgument() throws Throwable {
    when(mockManagerJoinPoint.proceed())
        .then(
            (Void) -> {
              storageManagerAspect.executeWithEntityTransaction(null, mockTransactionJoinPoint);
              return null;
            });
    when(mockTransactionJoinPoint.proceed())
        .then(
            (Void) -> {
              storageManagerAspect.executeLockEntity(
                  createLockEntityAnnotation(), mockLockEntityJoinPoint);
              return null;
            });
    User user = new User().setUsername("username");
    when(mockLockEntityMethodSignature.getParameterNames())
        .thenReturn(new String[] {"abc", "argument", "xyz"});
    when(mockLockEntityJoinPoint.getArgs()).thenReturn(new Object[] {null, user, null});

    storageManagerAspect.executeWithEntityManager(null, mockManagerJoinPoint);

    verify(mockTransactionJoinPoint).proceed();
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
