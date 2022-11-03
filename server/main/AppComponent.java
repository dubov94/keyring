package keyring.server.main;

import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import keyring.server.main.geolocation.GeolocationModule;
import keyring.server.main.interceptors.AgentInterceptor;
import keyring.server.main.interceptors.SessionAccessor;
import keyring.server.main.interceptors.SessionInterceptor;
import keyring.server.main.interceptors.VersionInterceptor;
import keyring.server.main.keyvalue.KeyValueModule;
import keyring.server.main.services.AdministrationService;
import keyring.server.main.services.AuthenticationService;
import keyring.server.main.storage.AccountOperationsInterface;
import keyring.server.main.storage.StorageModule;
import keyring.server.main.templates.TemplatesModule;

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

  SessionAccessor sessionAccessor();

  EntityManagerFactory entityManagerFactory();

  AccountOperationsInterface accountOperationsInterface();

  AgentInterceptor agentInterceptor();

  VersionInterceptor versionInterceptor();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
