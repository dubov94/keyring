package keyring.server.janitor;

import com.google.common.collect.ImmutableMap;
import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import keyring.server.main.Arithmetic;
import keyring.server.main.Chronometry;

@Module
class AppModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory(Environment environment) {
    if (environment.isProduction()) {
      return Persistence.createEntityManagerFactory(
          "production",
          ImmutableMap.of("javax.persistence.jdbc.password", environment.getPostgresPassword()));
    }
    return Persistence.createEntityManagerFactory(
        "development", ImmutableMap.of("hibernate.hbm2ddl.auto", "none"));
  }

  @Provides
  @Singleton
  static Arithmetic provideArithmetic() {
    return new Arithmetic();
  }

  @Provides
  @Singleton
  static Chronometry provideChronometry(Arithmetic arithmetic) {
    return new Chronometry(arithmetic);
  }
}
