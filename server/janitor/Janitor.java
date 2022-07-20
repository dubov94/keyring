package server.janitor;

import com.beust.jcommander.JCommander;
import com.google.common.collect.ImmutableList;
import org.aspectj.lang.Aspects;
import server.main.aspects.StorageManagerAspect;

final class Janitor {
  private AppComponent appComponent;
  private ImmutableList<Runnable> tasks;

  public static void main(String[] args) throws InterruptedException {
    Environment environment = new Environment();
    JCommander.newBuilder().addObject(environment).build().parse(args);
    Janitor janitor = new Janitor();
    janitor.initialize(environment);
    janitor.start();
  }

  private void initialize(Environment environment) {
    appComponent = DaggerAppComponent.builder().environment(environment).build();
    Aspects.aspectOf(StorageManagerAspect.class).initialize(appComponent.entityManagerFactory());
    tasks =
        ImmutableList.of(
            appComponent.deletedUsers(),
            appComponent.expiredMailTokens(),
            appComponent.expiredOtpParams(),
            appComponent.expiredOtpTokens(),
            appComponent.expiredPendingUsers(),
            appComponent.expiredSessionRecords());
  }

  private void start() {
    tasks.forEach(
        (task) -> {
          task.run();
        });
  }
}
