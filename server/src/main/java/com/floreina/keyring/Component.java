package com.floreina.keyring;

import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.DatabaseModule;
import com.floreina.keyring.interceptors.SessionInterceptor;
import com.floreina.keyring.interceptors.SessionKeys;
import com.floreina.keyring.services.AdministrationService;
import com.floreina.keyring.services.AuthenticationService;
import com.floreina.keyring.sessions.SessionsModule;
import com.floreina.keyring.templates.TemplatesModule;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;

@dagger.Component(
  modules = {
    UtilitiesModule.class,
    TemplatesModule.class,
    DatabaseModule.class,
    SessionsModule.class
  }
)
@Singleton
interface Component {
  AuthenticationService authenticationService();

  AdministrationService administrationService();

  SessionInterceptor sessionInterceptor();

  SessionKeys sessionKeys();

  EntityManagerFactory entityManagerFactory();

  AccountingInterface accountingInterface();
}
