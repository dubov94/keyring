package server.main.storage;

import server.main.Chronometry;
import server.main.Environment;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;

@Module
public class StorageModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory(Environment environment) {
    return Persistence.createEntityManagerFactory(
        environment.isProduction() ? "production" : "development");
  }

  @Provides
  static AccountOperationsInterface provideAccountOperationsInterface(Chronometry chronometry) {
    return new AccountOperationsClient(chronometry);
  }

  @Provides
  static KeyOperationsInterface provideKeyOperationsInterface() {
    return new KeyOperationsClient();
  }
}
