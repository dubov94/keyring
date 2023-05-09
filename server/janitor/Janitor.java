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
            appComponent.deletedUserEviction(),
            appComponent.pendingUserExpiration(),
            appComponent.mailTokenEviction(),
            appComponent.otpParamsEviction(),
            appComponent.otpTokenEviction(),
            appComponent.sessionRecordEviction(),
            appComponent.initiatedSessionExpiration(),
            appComponent.activatedSessionExpiration());
  }

  private void start() {
    tasks.forEach(
        (task) -> {
          task.run();
        });
  }
}
