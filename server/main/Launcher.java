package keyring.server.main;

import com.beust.jcommander.JCommander;
import com.google.common.base.Charsets;
import com.google.common.io.CharStreams;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.ServerInterceptors;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.logging.Logger;
import keyring.server.main.aspects.StorageManagerAspect;
import keyring.server.main.aspects.ValidateUserAspect;
import org.aspectj.lang.Aspects;

class Launcher {
  private static final Logger logger = Logger.getLogger(Launcher.class.getName());
  private Server server;
  private AppComponent appComponent;

  public static void main(String[] args) throws IOException, InterruptedException {
    String mrgnVersion =
        CharStreams.toString(
                new InputStreamReader(
                    Launcher.class.getResourceAsStream("/mrgn_version.txt"), Charsets.UTF_8))
            .trim();
    Environment environment = new Environment(mrgnVersion);
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
        .initialize(appComponent.sessionAccessor(), appComponent.accountOperationsInterface());
    Aspects.aspectOf(StorageManagerAspect.class).initialize(appComponent.entityManagerFactory());
  }

  private void startServer(int port) throws IOException {
    server =
        ServerBuilder.forPort(port)
            .addService(
                ServerInterceptors.interceptForward(
                    appComponent.authenticationService(),
                    appComponent.versionInterceptor(),
                    appComponent.agentInterceptor()))
            .addService(
                ServerInterceptors.interceptForward(
                    appComponent.administrationService(),
                    appComponent.versionInterceptor(),
                    appComponent.agentInterceptor(),
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
