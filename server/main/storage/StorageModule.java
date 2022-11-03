package keyring.server.main.storage;

import com.google.common.collect.ImmutableMap;
import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import keyring.server.main.Chronometry;
import keyring.server.main.Environment;

@Module
public class StorageModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory(Environment environment) {
    if (environment.isProduction()) {
      return Persistence.createEntityManagerFactory(
          "production",
          ImmutableMap.of("javax.persistence.jdbc.password", environment.getPostgresPassword()));
    }
    return Persistence.createEntityManagerFactory(
        "development", ImmutableMap.of("hibernate.hbm2ddl.auto", "create"));
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
