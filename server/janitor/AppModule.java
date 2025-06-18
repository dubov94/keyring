package keyring.server.janitor;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import dagger.Module;
import dagger.Provides;
import java.net.URI;
import java.time.Instant;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import keyring.server.main.Arithmetic;
import keyring.server.main.Chronometry;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisSentinelPool;
import redis.clients.jedis.Protocol;
import redis.clients.jedis.util.Pool;

@Module
class AppModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory(Environment environment) {
    if (environment.isProduction()) {
      return Persistence.createEntityManagerFactory(
          "production",
          ImmutableMap.of(
              "javax.persistence.jdbc.url", environment.getPostgresJdbcUri(),
              "javax.persistence.jdbc.user", environment.getPostgresUsername(),
              "javax.persistence.jdbc.password", environment.getPostgresPassword()
          )
      );
    }
    return Persistence.createEntityManagerFactory(
        "development", ImmutableMap.of("hibernate.hbm2ddl.auto", "none"));
  }

  @Provides
  @Singleton
  static Arithmetic provideArithmetic() {
    return new Arithmetic();
  }

  @Provides
  @Singleton
  static Chronometry provideChronometry(Arithmetic arithmetic) {
    return new Chronometry(arithmetic, Instant::now);
  }

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
}
