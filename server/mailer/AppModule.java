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
import javax.inject.Singleton;
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
}
