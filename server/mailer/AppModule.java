package keyring.server.mailer;

import com.google.common.collect.ImmutableSet;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import dagger.Module;
import dagger.Provides;
import java.net.URI;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;
import javax.inject.Named;
import javax.inject.Singleton;
import net.sargue.mailgun.Configuration;
import net.sargue.mailgun.Mail;
import org.jtwig.JtwigTemplate;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisSentinelPool;
import redis.clients.jedis.Protocol;
import redis.clients.jedis.util.Pool;

@Module
class AppModule {
  @Provides
  @Singleton
  static Pool<Jedis> provideJedisPool(Environment environment) {
    if (environment.isProduction()) {
      return new JedisSentinelPool(
          "default",
          // https://github.com/bitnami/charts/tree/master/bitnami/redis#master-replicas-with-sentinel
          ImmutableSet.of(
              String.format("%s:%d", environment.getRedisHost(), Protocol.DEFAULT_SENTINEL_PORT)),
          environment.getRedisPassword(),
          environment.getRedisPassword());
    }
    return new JedisPool(
        URI.create(
            String.format("redis://%s:%d", environment.getRedisHost(), Protocol.DEFAULT_PORT)));
  }

  @Provides
  static ListeningExecutorService provideMessageConsumerExecutorService() {
    return MoreExecutors.listeningDecorator(
        MoreExecutors.getExitingExecutorService(
            (ThreadPoolExecutor)
                Executors.newFixedThreadPool(ConsumerSettings.MAX_MESSAGES_PER_READ),
            ConsumerSettings.K8S_GRACE_PERIOD_MILLIS,
            TimeUnit.MILLISECONDS));
  }

  private static class LocalMailService implements MailService {
    private static final Logger logger = Logger.getLogger(LocalMailService.class.getName());

    @Override
    public void send(String to, String head, String body) {
      logger.info(String.format("send(%s, %s, %s)", to, head, body));
    }
  }

  private static class MailgunService implements MailService {
    private String fromName;
    private String fromAddress;
    private Configuration configuration;

    MailgunService(String fromName, String fromAddress, Configuration configuration) {
      this.fromName = fromName;
      this.fromAddress = fromAddress;
      this.configuration = configuration;
    }

    @Override
    public void send(String to, String head, String body) {
      Mail.using(configuration)
          .from(fromName, fromAddress)
          .to(to)
          .subject(head)
          .html(body)
          .build()
          .send();
    }
  }

  @Provides
  static MailService provideMailService(Environment environment) {
    if (environment.isProduction()) {
      return new MailgunService(
          environment.getEmailFromName(),
          environment.getEmailFromAddress(),
          new Configuration()
              .apiUrl(environment.getMailgunApiUrl())
              .domain(environment.getMailgunDomain())
              .apiKey(environment.getMailgunApiKey()));
    }
    return new LocalMailService();
  }

  @Provides
  static MailClient provideMailClient(
      Environment environment,
      MailService mailService,
      @Named("mail_vc_head") JtwigTemplate mailVcHeadTemplate,
      @Named("mail_vc_body") JtwigTemplate mailVcBodyTemplate,
      @Named("uncompleted_authn_head") JtwigTemplate uncompletedAuthnHeadTemplate,
      @Named("uncompleted_authn_body") JtwigTemplate uncompletedAuthnBodyTemplate) {
    return new TemplatedMailClient(
        mailService,
        mailVcHeadTemplate,
        mailVcBodyTemplate,
        uncompletedAuthnHeadTemplate,
        uncompletedAuthnBodyTemplate);
  }
}
