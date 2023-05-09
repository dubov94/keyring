package keyring.server.janitor;

import com.beust.jcommander.JCommander;
import com.google.common.collect.ImmutableList;
import keyring.server.main.aspects.StorageManagerAspect;
import org.aspectj.lang.Aspects;

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
            appComponent.disabledSessionRecords(),
            appComponent.expiredOtpParams(),
            appComponent.expiredOtpTokens(),
            appComponent.expiredPendingUsers(),
            appComponent.expiredSessionRecords(),
            appComponent.mailTokenEviction());
  }

  private void start() {
    tasks.forEach(
        (task) -> {
          task.run();
        });
  }
}
