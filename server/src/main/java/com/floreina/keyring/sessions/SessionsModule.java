package com.floreina.keyring.sessions;

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
    return new JedisPool(new JedisPoolConfig(), "redis");
  }
}
