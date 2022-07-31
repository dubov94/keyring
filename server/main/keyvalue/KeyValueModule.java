package server.main.keyvalue;

import static redis.clients.jedis.Protocol.DEFAULT_PORT;
import static redis.clients.jedis.Protocol.DEFAULT_TIMEOUT;

import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import server.main.Environment;

@Module
public class KeyValueModule {
  private static final int EXTENDED_TIMEOUT_IN_MILLIS = 8000;

  @Provides
  @Singleton
  static JedisPool provideJedisPool(Environment environment) {
    if (environment.isProduction()) {
      return new JedisPool(
          new JedisPoolConfig(),
          environment.getRedisHost(),
          DEFAULT_PORT,
          DEFAULT_TIMEOUT,
          environment.getRedisPassword());
    }
    return new JedisPool(
        new JedisPoolConfig(),
        environment.getRedisHost(),
        DEFAULT_PORT,
        EXTENDED_TIMEOUT_IN_MILLIS);
  }
}
