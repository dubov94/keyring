package com.floreina.keyring.keyvalue;

import com.floreina.keyring.Environment;
import dagger.Module;
import dagger.Provides;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

import javax.inject.Singleton;

import static redis.clients.jedis.Protocol.DEFAULT_PORT;
import static redis.clients.jedis.Protocol.DEFAULT_TIMEOUT;

@Module
public class KeyValueModule {
  private static final int EXTENDED_TIMEOUT_IN_MILLIS = 8000;

  @Provides
  @Singleton
  static JedisPool provideJedisPool(Environment environment) {
    return new JedisPool(
        new JedisPoolConfig(),
        environment.getRedisHost(),
        DEFAULT_PORT,
        environment.isProduction() ? DEFAULT_TIMEOUT : EXTENDED_TIMEOUT_IN_MILLIS);
  }
}
