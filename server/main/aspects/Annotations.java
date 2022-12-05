package keyring.server.main.aspects;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import keyring.server.main.entities.columns.UserState;

public class Annotations {
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.METHOD)
  public @interface ValidateUser {
    UserState[] states() default {UserState.ACTIVE};
  }

  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.FIELD)
  public @interface ContextualEntityManager {}

  /**
   * Prevents `OptimisticLockException` in distributed environments by reusing `EntityManager`, thus
   * leveraging first-level cache and avoiding stale results.
   */
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.METHOD)
  public @interface WithEntityManager {}

  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.METHOD)
  public @interface WithEntityTransaction {}

  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.METHOD)
  public @interface LockEntity {
    String name();
  }
}
