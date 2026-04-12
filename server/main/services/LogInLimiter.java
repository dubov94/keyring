package keyring.server.main.services;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.serialization.Mapper;
import io.github.bucket4j.redis.jedis.cas.JedisBasedProxyManager;
import java.time.Duration;
import javax.inject.Inject;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.util.Pool;

public class LogInLimiter {
  private static final BucketConfiguration CONFIGURATION =
      BucketConfiguration.builder().addLimit(Bandwidth.simple(8, Duration.ofMinutes(10))).build();

  private final ProxyManager<String> proxyManager;

  @Inject
  LogInLimiter(Pool<Jedis> jedisPool) {
    this.proxyManager =
        JedisBasedProxyManager.builderFor(jedisPool).withKeyMapper(Mapper.STRING).build();
  }

  public boolean acquireAttempt(String username, String ipAddress) {
    return proxyManager
        .builder()
        .build(String.format("bucket4j:log-in:%s@%s", username, ipAddress), () -> CONFIGURATION)
        .tryConsume(1);
  }
}
