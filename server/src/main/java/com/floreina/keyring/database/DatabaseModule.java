package com.floreina.keyring.database;

import com.floreina.keyring.Environment;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;

@Module
public class DatabaseModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory() {
    return Persistence.createEntityManagerFactory(
        Environment.isProduction() ? "production" : "development");
  }

  @Provides
  static AccountingInterface provideAccountingInterface() {
    return new AccountingClient();
  }

  @Provides
  static ManagementInterface provideManagementInterface() {
    return new ManagementClient();
  }
}
