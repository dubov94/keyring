package com.floreina.keyring;

import com.floreina.keyring.geolocation.GeolocationModule;
import com.floreina.keyring.interceptors.RequestMetadataInterceptor;
import com.floreina.keyring.interceptors.SessionInterceptor;
import com.floreina.keyring.interceptors.SessionInterceptorKeys;
import com.floreina.keyring.keyvalue.KeyValueModule;
import com.floreina.keyring.services.AdministrationService;
import com.floreina.keyring.services.AuthenticationService;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.StorageModule;
import com.floreina.keyring.templates.TemplatesModule;

import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;

@dagger.Component(
  modules = {
    AppModule.class,
    GeolocationModule.class,
    KeyValueModule.class,
    StorageModule.class,
    TemplatesModule.class
  }
)
@Singleton
interface AppComponent {
  AuthenticationService authenticationService();

  AdministrationService administrationService();

  SessionInterceptor sessionInterceptor();

  SessionInterceptorKeys sessionInterceptorKeys();

  EntityManagerFactory entityManagerFactory();

  AccountOperationsInterface accountOperationsInterface();

  RequestMetadataInterceptor requestMetadataInterceptor();

  EntitiesExpiration expireEntitiesMethods();

  @dagger.Component.Builder
  interface Builder {
    @dagger.BindsInstance Builder environment(Environment environment);

    AppComponent build();
  }
}