package com.floreina.keyring.storage;

import com.floreina.keyring.Environment;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;

@Module
public class StorageModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory() {
    return Persistence.createEntityManagerFactory(
        Environment.isProduction() ? "production" : "development");
  }

  @Provides
  static AccountOperationsInterface provideAccountOperationsInterface() {
    return new AccountOperationsClient();
  }

  @Provides
  static KeyOperationsInterface provideKeyOperationsInterface() {
    return new KeyOperationsClient();
  }
}
