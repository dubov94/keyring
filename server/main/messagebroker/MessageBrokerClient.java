package keyring.server.main.messagebroker;

import com.google.common.collect.ImmutableMap;
import java.util.Base64;
import javax.inject.Inject;
import keyring.server.mailer.BrokerKeys;
import keyring.server.mailer.requests.MailVc;
import keyring.server.mailer.requests.MailerRequest;
import keyring.server.mailer.requests.UncompletedAuthn;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.StreamEntryID;
import redis.clients.jedis.params.XAddParams;
import redis.clients.jedis.util.Pool;

public class MessageBrokerClient {
  private static final long MAILER_MAX_LEN = 640;
  private Pool<Jedis> jedisPool;
  private Base64.Encoder base64Encoder;

  @Inject
  public MessageBrokerClient(Pool<Jedis> jedisPool) {
    this.jedisPool = jedisPool;
    this.base64Encoder = Base64.getEncoder();
  }

  private void publishMailerRequest(MailerRequest mailerRequest) {
    try (Jedis jedis = jedisPool.getResource()) {
      jedis.xadd(
          BrokerKeys.MAILER_STREAM,
          // https://github.com/redis/redis/issues/5774
          new XAddParams().id(StreamEntryID.NEW_ENTRY).approximateTrimming().maxLen(MAILER_MAX_LEN),
          ImmutableMap.of(
              BrokerKeys.REQUEST_FIELD, base64Encoder.encodeToString(mailerRequest.toByteArray())));
    }
  }

  public void publishMailVc(String mail, String code) {
    publishMailerRequest(
        MailerRequest.newBuilder()
            .setMailVc(MailVc.newBuilder().setMail(mail).setCode(code))
            .build());
  }

  public void publishUncompletedAuthn(String mail, String ipAddress) {
    publishMailerRequest(
        MailerRequest.newBuilder()
            .setUncompletedAuthn(
                UncompletedAuthn.newBuilder().setMail(mail).setIpAddress(ipAddress))
            .build());
  }
}
