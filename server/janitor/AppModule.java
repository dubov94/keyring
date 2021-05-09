package server.janitor;

import com.google.common.collect.ImmutableMap;
import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import server.main.Chronometry;

@Module
class AppModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory(Environment environment) {
    if (environment.isProduction()) {
      return Persistence.createEntityManagerFactory("production");
    }
    return Persistence.createEntityManagerFactory(
        "development", ImmutableMap.of("hibernate.hbm2ddl.auto", "create"));
  }

  @Provides
  @Singleton
  static Chronometry provideChronometry() {
    return new Chronometry();
  }
}
