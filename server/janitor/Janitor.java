package server.janitor;

import com.beust.jcommander.JCommander;
import com.google.common.collect.ImmutableList;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.aspectj.lang.Aspects;
import server.main.aspects.StorageManagerAspect;

final class Janitor {
  private static final long PERIOD_M = 1;
  private AppComponent appComponent;
  private ScheduledExecutorService scheduledExecutorService;

  public static void main(String[] args) throws InterruptedException {
    Environment environment = new Environment();
    JCommander.newBuilder().addObject(environment).build().parse(args);
    Janitor janitor = new Janitor();
    janitor.initialize(environment);
    Runtime.getRuntime().addShutdownHook(new Thread(janitor::cleanUp));
    janitor.start();
    janitor.awaitTermination();
  }

  private void initialize(Environment environment) {
    appComponent = DaggerAppComponent.builder().environment(environment).build();
    scheduledExecutorService = new ScheduledThreadPoolExecutor(1);
    Aspects.aspectOf(StorageManagerAspect.class).initialize(appComponent.entityManagerFactory());
  }

  private void start() {
    for (Runnable task :
        ImmutableList.of(
            appComponent.deletedUsers(),
            appComponent.expiredMailTokens(),
            appComponent.expiredOtpParams(),
            appComponent.expiredPendingUsers(),
            appComponent.expiredSessionRecords())) {
      scheduledExecutorService.scheduleWithFixedDelay(task, 0, PERIOD_M, TimeUnit.MINUTES);
    }
  }

  private void cleanUp() {
    scheduledExecutorService.shutdown();
  }

  private void awaitTermination() throws InterruptedException {
    scheduledExecutorService.awaitTermination(Long.MAX_VALUE, TimeUnit.NANOSECONDS);
  }
}
