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
  @Singleton
  static Limiters provideLimiters() {
    return new Limiters(
        /* approxMaxKeysPerUser */ 2048,
        /* approxMaxMailTokensPerUser */ 4,
        /* approxMaxMailTokensPerAddress */ 2,
        /* approxMaxRecentSessionsPerUser */ 15,
        /* approxMaxOtpParamsPerUser */ 4);
  }

  @Provides
  static AccountOperationsInterface provideAccountOperationsInterface(
      Chronometry chronometry, Limiters limiters) {
    return new AccountOperationsClient(chronometry, limiters, /* initialSpareAttempts */ 5);
  }

  @Provides
  static KeyOperationsInterface provideKeyOperationsInterface(Limiters limiters) {
    return new KeyOperationsClient(limiters);
  }
}
