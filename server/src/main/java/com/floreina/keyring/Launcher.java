package com.floreina.keyring;

import com.floreina.keyring.aspects.StorageManagerAspect;
import com.floreina.keyring.aspects.ValidateUserAspect;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.ServerInterceptors;
import org.aspectj.lang.Aspects;

import java.io.IOException;
import java.util.logging.Logger;

class Launcher {
  private static final Logger logger = Logger.getLogger(Launcher.class.getName());
  private Server server;
  private Component component;

  public static void main(String[] args) throws IOException, InterruptedException {
    Launcher launcher = new Launcher();
    launcher.initialize();
    launcher.start();
    launcher.blockUntilShutdown();
  }

  private void initialize() {
    component = DaggerComponent.create();
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(component.sessionKeys(), component.accountOperationsInterface());
    Aspects.aspectOf(StorageManagerAspect.class).initialize(component.entityManagerFactory());
  }

  private void start() throws IOException {
    server =
        ServerBuilder.forPort(591)
            .addService(
                ServerInterceptors.intercept(
                    component.authenticationService(), component.userMetadataInterceptor()))
            .addService(
                ServerInterceptors.intercept(
                    component.administrationService(),
                    component.userMetadataInterceptor(),
                    component.sessionInterceptor()))
            .build();
    Runtime.getRuntime().addShutdownHook(new Thread(this::stop));
    server.start();
    logger.info("Listening...");
  }

  private void stop() {
    if (server != null) {
      server.shutdown();
    }
  }

  private void blockUntilShutdown() throws InterruptedException {
    if (server != null) {
      server.awaitTermination();
    }
  }
}
