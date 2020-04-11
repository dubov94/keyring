package com.floreina.keyring;

import com.beust.jcommander.JCommander;
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
  private static final int EXPIRATION_TIMEOUT_IN_S = 60 * 1000;
  private Server server;
  private AppComponent appComponent;
  private Timer timer;
  private EntitiesExpiration entitiesExpiration;

  public static void main(String[] args) throws IOException, InterruptedException {
    Environment environment = new Environment();
    JCommander.newBuilder().addObject(environment).build().parse(args);
    Launcher launcher = new Launcher();
    launcher.initialize(environment);
    Runtime.getRuntime().addShutdownHook(new Thread(launcher::cleanUp));
    launcher.startServer(environment.getPort());
    launcher.scheduleExpiration();
    launcher.awaitTermination();
  }

  private void initialize(Environment environment) {
    appComponent = DaggerAppComponent.builder().environment(environment).build();
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(
            appComponent.sessionInterceptorKeys(),
            appComponent.accountOperationsInterface());
    Aspects.aspectOf(StorageManagerAspect.class).initialize(appComponent.entityManagerFactory());
  }

  private void startServer(int port) throws IOException {
    server =
        ServerBuilder.forPort(port)
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
    logger.info(String.format("Listening on %d", port));
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
        EXPIRATION_TIMEOUT_IN_S);
  }

  private void cleanUp() {
    if (timer != null) {
      timer.cancel();
    }
    if (server != null) {
      server.shutdown();
    }
  }

  private void awaitTermination() throws InterruptedException {
    server.awaitTermination();
  }
}
