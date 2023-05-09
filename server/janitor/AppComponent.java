package keyring.server.janitor;

import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import keyring.server.janitor.tasks.ActivatedSessionExpiration;
import keyring.server.janitor.tasks.DeletedUserEviction;
import keyring.server.janitor.tasks.InitiatedSessionExpiration;
import keyring.server.janitor.tasks.MailTokenEviction;
import keyring.server.janitor.tasks.OtpParamsEviction;
import keyring.server.janitor.tasks.OtpTokenEviction;
import keyring.server.janitor.tasks.PendingUserExpiration;
import keyring.server.janitor.tasks.SessionRecordEviction;

@Component(modules = {AppModule.class})
@Singleton
interface AppComponent {
  EntityManagerFactory entityManagerFactory();

  ActivatedSessionExpiration activatedSessionExpiration();

  DeletedUserEviction deletedUserEviction();

  InitiatedSessionExpiration initiatedSessionExpiration();

  MailTokenEviction mailTokenEviction();

  OtpParamsEviction otpParamsEviction();

  OtpTokenEviction otpTokenEviction();

  PendingUserExpiration pendingUserExpiration();

  SessionRecordEviction sessionRecordEviction();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
