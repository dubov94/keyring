package keyring.server.mailer;

import com.beust.jcommander.JCommander;
import com.google.common.util.concurrent.UncaughtExceptionHandlers;
import java.util.logging.Logger;

final class Mailer {
  private static final Logger logger = Logger.getLogger(Mailer.class.getName());
  private AppComponent appComponent;

  public static void main(String[] args) throws InterruptedException {
    Environment environment = new Environment();
    JCommander.newBuilder().addObject(environment).build().parse(args);
    Mailer mailer = new Mailer();
    mailer.initialize(environment);
    MessageConsumer messageConsumer = mailer.messageConsumer();
    Runtime.getRuntime().addShutdownHook(new Thread(messageConsumer::stop));
    Thread thread = new Thread(messageConsumer);
    thread.setUncaughtExceptionHandler(UncaughtExceptionHandlers.systemExit());
    logger.info("Running `MessageConsumer`");
    thread.start();
    thread.join();
  }

  private void initialize(Environment environment) {
    appComponent = DaggerAppComponent.builder().environment(environment).build();
  }

  private MessageConsumer messageConsumer() {
    return appComponent.messageConsumer();
  }
}
