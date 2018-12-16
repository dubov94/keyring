package com.floreina.keyring.aspects;

import com.floreina.keyring.storage.StorageException;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StorageManagerAspectTest {
  @Mock private EntityManagerFactory mockEntityManagerFactory;
  @Mock private EntityManager mockEntityManager;
  @Mock private EntityTransaction mockEntityTransaction;
  @Mock private ProceedingJoinPoint mockProceedingJoinPoint;

  private StorageManagerAspect storageManagerAspect;

  @BeforeEach
  void beforeEach() {
    storageManagerAspect = new StorageManagerAspect();
    storageManagerAspect.initialize(mockEntityManagerFactory);
    when(mockEntityManagerFactory.createEntityManager()).thenReturn(mockEntityManager);
    when(mockEntityManager.getTransaction()).thenReturn(mockEntityTransaction);
  }

  @Test
  void get_oneThreadSetsEntityManager_anotherThreadSeesNull() throws Throwable {
    when(mockProceedingJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(mockEntityManager, storageManagerAspect.get(null));
              Thread thread = new Thread(() -> assertEquals(null, storageManagerAspect.get(null)));
              thread.start();
              thread.join();
              return null;
            });

    storageManagerAspect.around(null, mockProceedingJoinPoint);

    verify(mockProceedingJoinPoint).proceed();
  }

  @Test
  void get_recursiveLocalTransaction_usesSameEntityManager() throws Throwable {
    ProceedingJoinPoint mockAnotherJoinPoint = mock(ProceedingJoinPoint.class);
    when(mockAnotherJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(mockEntityManager, storageManagerAspect.get(null));
              return null;
            });
    when(mockProceedingJoinPoint.proceed())
        .then(
            (Void) -> {
              assertEquals(mockEntityManager, storageManagerAspect.get(null));
              storageManagerAspect.around(null, mockAnotherJoinPoint);
              return null;
            });

    storageManagerAspect.around(null, mockProceedingJoinPoint);

    verify(mockProceedingJoinPoint).proceed();
  }

  @Test
  void around_joinPointThrows_rollbacksClosesAndRemovesReference() throws Throwable {
    when(mockProceedingJoinPoint.proceed()).thenThrow(new RuntimeException());
    when(mockEntityTransaction.isActive()).thenReturn(true);

    assertThrows(
        StorageException.class, () -> storageManagerAspect.around(null, mockProceedingJoinPoint));

    verify(mockEntityTransaction).rollback();
    verify(mockEntityManager).close();
    assertEquals(null, storageManagerAspect.get(null));
  }

  @Test
  void around_getTransactionThrows_noRollback() throws Throwable {
    when(mockEntityManager.getTransaction()).thenThrow(new RuntimeException());

    assertThrows(
        StorageException.class, () -> storageManagerAspect.around(null, mockProceedingJoinPoint));
  }

  @Test
  void around_inactiveTransactionThrows_noRollback() throws Throwable {
    doThrow(new RuntimeException()).when(mockEntityTransaction).begin();
    when(mockEntityTransaction.isActive()).thenReturn(false);

    assertThrows(
        StorageException.class, () -> storageManagerAspect.around(null, mockProceedingJoinPoint));

    verify(mockEntityTransaction, never()).rollback();
  }

  @Test
  void around_isActiveThrows_databaseExceptionThrown() throws Throwable {
    doThrow(new RuntimeException()).when(mockEntityTransaction).begin();
    when(mockEntityTransaction.isActive()).thenThrow(new RuntimeException());

    assertThrows(
        StorageException.class, () -> storageManagerAspect.around(null, mockProceedingJoinPoint));
  }

  @Test
  void around_rollbackThrows_databaseExceptionThrown() throws Throwable {
    doThrow(new RuntimeException()).when(mockEntityTransaction).commit();
    when(mockEntityTransaction.isActive()).thenReturn(true);
    doThrow(new RuntimeException()).when(mockEntityTransaction).rollback();

    assertThrows(
        StorageException.class, () -> storageManagerAspect.around(null, mockProceedingJoinPoint));
  }

  @Test
  void around_joinPointReturnsValue_propagatesValueBack() throws Throwable {
    when(mockProceedingJoinPoint.proceed()).thenReturn(0);

    assertEquals(0, storageManagerAspect.around(null, mockProceedingJoinPoint));
  }
}
