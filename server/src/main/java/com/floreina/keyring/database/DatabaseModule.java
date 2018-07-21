package com.floreina.keyring.database;

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
    return Persistence.createEntityManagerFactory("production");
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
