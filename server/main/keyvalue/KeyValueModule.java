package server.main.keyvalue;

import com.google.common.collect.ImmutableSet;
import dagger.Module;
import dagger.Provides;
import java.net.URI;
import javax.inject.Singleton;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisSentinelPool;
import redis.clients.jedis.Protocol;
import redis.clients.jedis.util.Pool;
import server.main.Environment;

@Module
public class KeyValueModule {
  private static final int EXTENDED_TIMEOUT_IN_MILLIS = 8000;

  @Provides
  @Singleton
  static Pool<Jedis> provideJedisPool(Environment environment) {
    if (environment.isProduction()) {
      return new JedisSentinelPool(
          "default",
          // https://github.com/bitnami/charts/tree/master/bitnami/redis#master-replicas-with-sentinel
          ImmutableSet.of(
              String.format("%s:%d", environment.getRedisHost(), Protocol.DEFAULT_SENTINEL_PORT)),
          environment.getRedisPassword());
    }
    return new JedisPool(
        URI.create(
            String.format("redis://%s:%d", environment.getRedisHost(), Protocol.DEFAULT_PORT)),
        EXTENDED_TIMEOUT_IN_MILLIS);
  }
}
