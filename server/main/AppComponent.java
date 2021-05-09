package server.main;

import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import server.main.geolocation.GeolocationModule;
import server.main.interceptors.RequestMetadataInterceptor;
import server.main.interceptors.SessionInterceptor;
import server.main.interceptors.SessionInterceptorKeys;
import server.main.interceptors.VersionInterceptor;
import server.main.keyvalue.KeyValueModule;
import server.main.services.AdministrationService;
import server.main.services.AuthenticationService;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.StorageModule;
import server.main.templates.TemplatesModule;

@Component(
    modules = {
      AppModule.class,
      GeolocationModule.class,
      KeyValueModule.class,
      StorageModule.class,
      TemplatesModule.class
    })
@Singleton
interface AppComponent {
  AuthenticationService authenticationService();

  AdministrationService administrationService();

  SessionInterceptor sessionInterceptor();

  SessionInterceptorKeys sessionInterceptorKeys();

  EntityManagerFactory entityManagerFactory();

  AccountOperationsInterface accountOperationsInterface();

  RequestMetadataInterceptor requestMetadataInterceptor();

  VersionInterceptor versionInterceptor();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
