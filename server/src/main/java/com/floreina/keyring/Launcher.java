package com.floreina.keyring;

import com.floreina.keyring.aspects.StorageManagerAspect;
import com.floreina.keyring.aspects.ValidateUserAspect;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.ServerInterceptors;
import org.aspectj.lang.Aspects;

import java.io.IOException;
import java.time.Instant;
import java.util.Date;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Logger;

class Launcher {
  private static final Logger logger = Logger.getLogger(Launcher.class.getName());
  private Server server;
  private AppComponent appComponent;
  private Timer timer;
  private EntitiesExpiration entitiesExpiration;

  public static void main(String[] args) throws IOException, InterruptedException {
    Launcher launcher = new Launcher();
    launcher.initialize();
    Runtime.getRuntime().addShutdownHook(new Thread(launcher::stop));
    launcher.startServer();
    launcher.scheduleExpiration();
    launcher.awaitTermination();
  }

  private void initialize() {
    appComponent = DaggerAppComponent.create();
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(
            appComponent.sessionInterceptorKeys(),
            appComponent.accountOperationsInterface());
    Aspects.aspectOf(StorageManagerAspect.class).initialize(appComponent.entityManagerFactory());
  }

  private void startServer() throws IOException {
    server =
        ServerBuilder.forPort(591)
            .addService(
                ServerInterceptors.intercept(
                    appComponent.authenticationService(),
                    appComponent.requestMetadataInterceptor()))
            .addService(
                ServerInterceptors.intercept(
                    appComponent.administrationService(),
                    appComponent.requestMetadataInterceptor(),
                    appComponent.sessionInterceptor()))
            .build();
    server.start();
    logger.info("Listening...");
  }

  private void scheduleExpiration() {
    entitiesExpiration = appComponent.expireEntitiesMethods();
    timer = new Timer();
    timer.schedule(
        new TimerTask() {
          @Override
          public void run() {
            entitiesExpiration.dropDeletedUsersAndTheirDependencies();
            entitiesExpiration.dropExpiredMailTokens();
            entitiesExpiration.dropExpiredPendingUsers();
            entitiesExpiration.dropExpiredSessions();
          }
        },
        Date.from(Instant.now()),
        60 * 1000);
  }

  private void stop() {
    if (timer != null) {
      timer.cancel();
    }
    if (server != null) {
      server.shutdown();
    }
  }

  private void awaitTermination() throws InterruptedException {
    if (server != null) {
      server.awaitTermination();
    }
  }
}
