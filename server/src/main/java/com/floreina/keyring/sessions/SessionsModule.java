package com.floreina.keyring.sessions;

import com.floreina.keyring.Environment;
import dagger.Module;
import dagger.Provides;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

import javax.inject.Singleton;

@Module
public class SessionsModule {
  @Provides
  @Singleton
  static JedisPool provideJedisPool() {
    return new JedisPool(new JedisPoolConfig(), Environment.isProduction() ? "redis" : "localhost");
  }
}
