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
  @Provides
  @Singleton
  static JedisPool provideJedisPool() {
    boolean isProductionEnvironment = Environment.isProduction();
    return new JedisPool(
        new JedisPoolConfig(),
        isProductionEnvironment ? "redis" : "localhost",
        DEFAULT_PORT,
        isProductionEnvironment ? DEFAULT_TIMEOUT : 8000);
  }
}