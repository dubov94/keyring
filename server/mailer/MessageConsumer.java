package keyring.server.mailer;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Iterables;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.protobuf.InvalidProtocolBufferException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import keyring.server.mailer.requests.MailVcRequest;
import keyring.server.mailer.requests.MailerRequest;
import org.apache.commons.lang3.time.DateUtils;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.StreamEntryID;
import redis.clients.jedis.exceptions.JedisDataException;
import redis.clients.jedis.params.XAutoClaimParams;
import redis.clients.jedis.params.XReadGroupParams;
import redis.clients.jedis.resps.StreamEntry;
import redis.clients.jedis.util.Pool;

class MessageConsumer implements Runnable {
  private static final Logger logger = Logger.getLogger(MessageConsumer.class.getName());
  private static final long MAX_MESSAGE_IDLE_MILLIS = 8 * DateUtils.MILLIS_PER_SECOND;
  private volatile boolean running;
  private State state;
  private String consumerName;
  private Pool<Jedis> jedisPool;
  private Base64.Decoder base64Decoder;
  private ListeningExecutorService executorService;
  private MailClient mailClient;

  private enum State {
    READ_PENDING,
    CLAIM,
    READ_UNRECEIVED
  }

  private static final class FailureLoggingCallback implements FutureCallback<Void> {
    @Override
    public void onSuccess(Void result) {}

    @Override
    public void onFailure(Throwable throwable) {
      logger.log(Level.SEVERE, throwable.getMessage(), throwable);
    }
  }

  @Inject
  MessageConsumer(
      Environment environment,
      Pool<Jedis> jedisPool,
      ListeningExecutorService executorService,
      MailClient mailClient) {
    this.consumerName = environment.getConsumerName();
    this.jedisPool = jedisPool;
    this.base64Decoder = Base64.getDecoder();
    this.executorService = executorService;
    this.mailClient = mailClient;
  }

  private void createGroup(Jedis jedis) {
    try {
      jedis.xgroupCreate(
          BrokerKeys.MAILER_STREAM, BrokerKeys.DEFAULT_GROUP, new StreamEntryID(), true);
    } catch (JedisDataException exception) {
      logger.warning(
          String.format(
              "Unable to create consumer group `%s` for stream `%s`: %s",
              BrokerKeys.DEFAULT_GROUP, BrokerKeys.MAILER_STREAM, exception.getMessage()));
    }
  }

  private List<StreamEntry> autoClaim(Jedis jedis) {
    Map.Entry<StreamEntryID, List<StreamEntry>> streamToEntries =
        jedis.xautoclaim(
            BrokerKeys.MAILER_STREAM,
            BrokerKeys.DEFAULT_GROUP,
            consumerName,
            MAX_MESSAGE_IDLE_MILLIS,
            new StreamEntryID(),
            new XAutoClaimParams().count(ConsumerSettings.MAX_MESSAGES_PER_READ));
    return streamToEntries.getValue();
  }

  private List<StreamEntry> readBacklog(Jedis jedis) {
    List<Map.Entry<String, List<StreamEntry>>> streamToEntries =
        jedis.xreadGroup(
            BrokerKeys.DEFAULT_GROUP,
            consumerName,
            new XReadGroupParams().count(ConsumerSettings.MAX_MESSAGES_PER_READ),
            ImmutableMap.of(BrokerKeys.MAILER_STREAM, new StreamEntryID()));
    return Iterables.getOnlyElement(streamToEntries).getValue();
  }

  private Optional<List<StreamEntry>> readUnreceived(Jedis jedis) {
    List<Map.Entry<String, List<StreamEntry>>> streamToEntries =
        jedis.xreadGroup(
            BrokerKeys.DEFAULT_GROUP,
            consumerName,
            new XReadGroupParams()
                .block((int) (ConsumerSettings.K8S_GRACE_PERIOD_MILLIS / 2))
                .count(ConsumerSettings.MAX_MESSAGES_PER_READ),
            ImmutableMap.of(BrokerKeys.MAILER_STREAM, StreamEntryID.UNRECEIVED_ENTRY));
    if (streamToEntries == null) {
      return Optional.empty();
    }
    return Optional.of(Iterables.getOnlyElement(streamToEntries).getValue());
  }

  private void routeRequest(StreamEntry entry) {
    MailerRequest mailerRequest = MailerRequest.getDefaultInstance();
    try {
      mailerRequest =
          MailerRequest.parseFrom(
              base64Decoder.decode(entry.getFields().get(BrokerKeys.REQUEST_FIELD)));
    } catch (InvalidProtocolBufferException exception) {
      logger.severe(
          String.format(
              "Unable to parse `MailerRequest` from `%s`: %s",
              entry.getID(), exception.getMessage()));
    }
    MailerRequest.RequestCase requestCase = mailerRequest.getRequestCase();
    switch (requestCase) {
      case MAIL_VC_REQUEST:
        MailVcRequest mailVcRequest = mailerRequest.getMailVcRequest();
        ListenableFuture<Void> future =
            executorService.submit(
                () -> mailClient.sendMailVc(mailVcRequest.getMail(), mailVcRequest.getCode()),
                null);
        Futures.addCallback(future, new FailureLoggingCallback(), executorService);
        break;
      default:
        logger.severe(String.format("Unsupported `RequestCase`: %s", requestCase.name()));
    }
  }

  private void consumeRequests(Jedis jedis, List<StreamEntry> entries) {
    for (StreamEntry entry : entries) {
      routeRequest(entry);
      acknowledge(jedis, entry.getID());
    }
  }

  private void acknowledge(Jedis jedis, StreamEntryID entryId) {
    jedis.xack(BrokerKeys.MAILER_STREAM, BrokerKeys.DEFAULT_GROUP, entryId);
  }

  public void run() {
    logger.info(String.format("Consumer name: %s", consumerName));
    running = true;
    try (Jedis jedis = jedisPool.getResource()) {
      createGroup(jedis);
    }
    state = State.READ_PENDING;
    while (running) {
      try (Jedis jedis = jedisPool.getResource()) {
        if (Objects.equals(state, State.READ_PENDING)) {
          List<StreamEntry> entries = readBacklog(jedis);
          logger.info(String.format("Received %d pending messages", entries.size()));
          if (!entries.isEmpty()) {
            consumeRequests(jedis, entries);
          } else {
            state = State.CLAIM;
          }
        } else if (Objects.equals(state, State.CLAIM)) {
          List<StreamEntry> claimed = autoClaim(jedis);
          int count = claimed.size();
          if (count > 0) {
            logger.info(String.format("Claimed %d messages", count));
            consumeRequests(jedis, claimed);
          }
          state = State.READ_UNRECEIVED;
        } else if (Objects.equals(state, State.READ_UNRECEIVED)) {
          Optional<List<StreamEntry>> entries = readUnreceived(jedis);
          if (entries.isPresent()) {
            int count = entries.get().size();
            logger.info(String.format("Received %d new messages", count));
          }
          entries.ifPresent(items -> consumeRequests(jedis, items));
          state = State.CLAIM;
        } else {
          logger.severe(String.format("Unknown `State`: %s", state.name()));
        }
      }
    }
  }

  void stop() {
    running = false;
  }
}
