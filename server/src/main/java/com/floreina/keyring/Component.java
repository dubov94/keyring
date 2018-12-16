package com.floreina.keyring;

import com.floreina.keyring.interceptors.SessionInterceptor;
import com.floreina.keyring.interceptors.SessionKeys;
import com.floreina.keyring.interceptors.UserMetadataInterceptor;
import com.floreina.keyring.services.AdministrationService;
import com.floreina.keyring.services.AuthenticationService;
import com.floreina.keyring.sessions.SessionModule;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.StorageModule;
import com.floreina.keyring.templates.TemplatesModule;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;

@dagger.Component(
  modules = {UtilitiesModule.class, TemplatesModule.class, StorageModule.class, SessionModule.class}
)
@Singleton
interface Component {
  AuthenticationService authenticationService();

  AdministrationService administrationService();

  SessionInterceptor sessionInterceptor();

  SessionKeys sessionKeys();

  EntityManagerFactory entityManagerFactory();

  AccountOperationsInterface accountOperationsInterface();

  UserMetadataInterceptor userMetadataInterceptor();
}
