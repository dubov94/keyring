package server.main;

import com.beust.jcommander.JCommander;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.ServerInterceptors;
import java.io.IOException;
import java.util.logging.Logger;
import org.aspectj.lang.Aspects;
import server.main.aspects.StorageManagerAspect;
import server.main.aspects.ValidateUserAspect;

class Launcher {
  private static final Logger logger = Logger.getLogger(Launcher.class.getName());
  private Server server;
  private AppComponent appComponent;

  public static void main(String[] args) throws IOException, InterruptedException {
    Environment environment = new Environment();
    JCommander.newBuilder().addObject(environment).build().parse(args);
    Launcher launcher = new Launcher();
    launcher.initialize(environment);
    Runtime.getRuntime().addShutdownHook(new Thread(launcher::cleanUp));
    launcher.startServer(environment.getPort());
    launcher.awaitTermination();
  }

  private void initialize(Environment environment) {
    appComponent = DaggerAppComponent.builder().environment(environment).build();
    Aspects.aspectOf(ValidateUserAspect.class)
        .initialize(
            appComponent.sessionInterceptorKeys(), appComponent.accountOperationsInterface());
    Aspects.aspectOf(StorageManagerAspect.class).initialize(appComponent.entityManagerFactory());
  }

  private void startServer(int port) throws IOException {
    server =
        ServerBuilder.forPort(port)
            .addService(
                ServerInterceptors.intercept(
                    appComponent.authenticationService(),
                    appComponent.versionInterceptor(),
                    appComponent.requestMetadataInterceptor()))
            .addService(
                ServerInterceptors.intercept(
                    appComponent.administrationService(),
                    appComponent.versionInterceptor(),
                    appComponent.requestMetadataInterceptor(),
                    appComponent.sessionInterceptor()))
            .build();
    server.start();
    logger.info(String.format("Listening on %d", port));
  }

  private void cleanUp() {
    if (server != null) {
      server.shutdown();
    }
  }

  private void awaitTermination() throws InterruptedException {
    server.awaitTermination();
  }
}
