package com.floreina.keyring;

import com.floreina.keyring.cache.CacheModule;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.DatabaseModule;
import com.floreina.keyring.interceptors.RecognitionInterceptor;
import com.floreina.keyring.interceptors.RecognitionKeys;
import com.floreina.keyring.interceptors.SessionInterceptor;
import com.floreina.keyring.interceptors.SessionKeys;
import com.floreina.keyring.services.AdministrationService;
import com.floreina.keyring.services.AuthenticationService;
import com.floreina.keyring.templates.TemplatesModule;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;

@dagger.Component(
  modules = {UtilitiesModule.class, TemplatesModule.class, DatabaseModule.class, CacheModule.class}
)
@Singleton
interface Component {
  AuthenticationService authenticationService();

  AdministrationService administrationService();

  SessionInterceptor sessionInterceptor();

  SessionKeys sessionKeys();

  EntityManagerFactory entityManagerFactory();

  AccountingInterface accountingInterface();

  RecognitionInterceptor addressInterceptor();

  RecognitionKeys addressKeys();
}
