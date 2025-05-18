package keyring.server.mailer;

import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.common.util.concurrent.MoreExecutors;
import keyring.server.main.messagebroker.MessageBrokerClient;
import name.falgout.jeffrey.testing.junit5.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

@ExtendWith(MockitoExtension.class)
@Testcontainers
class MessageConsumerTest {
  @Container
  public GenericContainer redisContainer =
      new GenericContainer(DockerImageName.parse("redis")).withExposedPorts(6379);

  private static final String MAIL = "mail@example.com";
  private static final String USERNAME = "username";
  private static final String CODE = "0";

  @Mock private Environment mockEnvironment;
  private static JedisPool jedisPool;
  @Mock private MailClient mockMailClient;
  private MessageBrokerClient messageBrokerClient;
  private MessageConsumer messageConsumer;

  @BeforeEach
  void beforeEach() {
    when(mockEnvironment.getConsumerName()).thenReturn("default");
    jedisPool =
        new JedisPool(
            new JedisPoolConfig(), redisContainer.getHost(), redisContainer.getFirstMappedPort());
    messageBrokerClient = new MessageBrokerClient(jedisPool);
    messageConsumer =
        new MessageConsumer(
            mockEnvironment,
            jedisPool,
            MoreExecutors.newDirectExecutorService(),
            mockMailClient);
  }

  @Test
  void consumesMailVcRequest_sendsMailVc() throws InterruptedException {
    doAnswer(
            (invocation) -> {
              messageConsumer.stop();
              return null;
            })
        .when(mockMailClient)
        .sendMailVc(MAIL, USERNAME, CODE);
    messageBrokerClient.publishMailVc(MAIL, USERNAME, CODE);

    Thread thread = new Thread(messageConsumer);
    thread.start();
    thread.join();

    verify(mockMailClient).sendMailVc(MAIL, USERNAME, CODE);
  }
}
