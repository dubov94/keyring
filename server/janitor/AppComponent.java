package keyring.server.janitor;

import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import keyring.server.janitor.tasks.DeletedUserEviction;
import keyring.server.janitor.tasks.MailTokenEviction;
import keyring.server.janitor.tasks.OtpParamsEviction;
import keyring.server.janitor.tasks.OtpTokenEviction;
import keyring.server.janitor.tasks.PendingUserExpiration;
import keyring.server.janitor.tasks.SessionRecordEviction;
import keyring.server.janitor.tasks.SessionRecordExpiration;

@Component(modules = {AppModule.class})
@Singleton
interface AppComponent {
  EntityManagerFactory entityManagerFactory();

  DeletedUserEviction deletedUserEviction();

  MailTokenEviction mailTokenEviction();

  OtpParamsEviction otpParamsEviction();

  OtpTokenEviction otpTokenEviction();

  PendingUserExpiration pendingUserExpiration();

  SessionRecordEviction sessionRecordEviction();

  SessionRecordExpiration sessionRecordExpiration();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
