package keyring.server.janitor;

import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import keyring.server.janitor.tasks.DeletedUsers;
import keyring.server.janitor.tasks.DisabledSessionRecords;
import keyring.server.janitor.tasks.ExpiredMailTokens;
import keyring.server.janitor.tasks.ExpiredOtpParams;
import keyring.server.janitor.tasks.ExpiredOtpTokens;
import keyring.server.janitor.tasks.ExpiredPendingUsers;
import keyring.server.janitor.tasks.ExpiredSessionRecords;

@Component(modules = {AppModule.class})
@Singleton
interface AppComponent {
  EntityManagerFactory entityManagerFactory();

  DeletedUsers deletedUsers();

  DisabledSessionRecords disabledSessionRecords();

  ExpiredMailTokens expiredMailTokens();

  ExpiredOtpParams expiredOtpParams();

  ExpiredOtpTokens expiredOtpTokens();

  ExpiredPendingUsers expiredPendingUsers();

  ExpiredSessionRecords expiredSessionRecords();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
