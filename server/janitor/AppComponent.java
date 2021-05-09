package server.janitor;

import dagger.Component;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import server.janitor.tasks.DeletedUsers;
import server.janitor.tasks.ExpiredMailTokens;
import server.janitor.tasks.ExpiredPendingUsers;
import server.janitor.tasks.ExpiredSessionRecords;

@Component(modules = {AppModule.class})
@Singleton
interface AppComponent {
  EntityManagerFactory entityManagerFactory();

  DeletedUsers deletedUsers();

  ExpiredMailTokens expiredMailTokens();

  ExpiredPendingUsers expiredPendingUsers();

  ExpiredSessionRecords expiredSessionRecords();

  @dagger.Component.Builder
  interface Builder {
    @dagger.BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
