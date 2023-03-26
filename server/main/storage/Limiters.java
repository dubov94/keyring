package keyring.server.main.storage;

import java.time.temporal.ChronoUnit;
import java.util.List;
import javax.persistence.EntityManager;
import keyring.server.main.Chronometry;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.Key_;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.MailToken_;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.OtpParams_;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.Session_;

class Limiters {
  private final long approxMaxKeysPerUser;
  private final long approxMaxMailTokensPerUser;
  private final long approxMaxMailTokensPerIpAddress;
  private final long approxMaxLastHourSessionsPerUser;
  private final long approxMaxOtpParamsPerUser;

  Limiters(
      long approxMaxKeysPerUser,
      long approxMaxMailTokensPerUser,
      long approxMaxMailTokensPerIpAddress,
      long approxMaxLastHourSessionsPerUser,
      long approxMaxOtpParamsPerUser) {
    this.approxMaxKeysPerUser = approxMaxKeysPerUser;
    this.approxMaxMailTokensPerUser = approxMaxMailTokensPerUser;
    this.approxMaxMailTokensPerIpAddress = approxMaxMailTokensPerIpAddress;
    this.approxMaxLastHourSessionsPerUser = approxMaxLastHourSessionsPerUser;
    this.approxMaxOtpParamsPerUser = approxMaxOtpParamsPerUser;
  }

  void checkKeysPerUser(EntityManager entityManager, long userId, int toAdd) {
    long keyCount = Queries.countRowsByValue(entityManager, Key.class, Key_.user, userId);
    if (keyCount + toAdd > approxMaxKeysPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `Key`s, which is over the limit (%d)",
              userId, keyCount, approxMaxKeysPerUser));
    }
  }

  void checkMailTokensPerUser(EntityManager entityManager, long userId, int toAdd) {
    long mailTokenCount =
        Queries.countRowsByValue(entityManager, MailToken.class, MailToken_.user, userId);
    if (mailTokenCount + toAdd > approxMaxMailTokensPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `MailToken`s, which is over the limit (%d)",
              userId, mailTokenCount, approxMaxMailTokensPerUser));
    }
  }

  void checkMailTokensPerIpAddress(EntityManager entityManager, String ipAddress, int toAdd) {
    long mailTokenCount =
        Queries.countRowsByValue(entityManager, MailToken.class, MailToken_.ipAddress, ipAddress);
    if (mailTokenCount + toAdd > approxMaxMailTokensPerIpAddress) {
      throw new IllegalStateException(
          String.format(
              "IP address %s has %d `MailToken`s, which is over the limit (%d)",
              ipAddress, mailTokenCount, approxMaxMailTokensPerIpAddress));
    }
  }

  void checkRecentSessionsPerUser(
      Chronometry chronometry, EntityManager entityManager, long userId, int toAdd) {
    List<Session> allSessions =
        Queries.findManyToOne(entityManager, Session.class, Session_.user, userId);
    int recentCount = 0;
    for (Session session : allSessions) {
      if (!chronometry.isBefore(
          session.getTimestamp(),
          chronometry.subtract(chronometry.currentTime(), 1, ChronoUnit.HOURS))) {
        recentCount += 1;
      }
    }
    if (recentCount + toAdd > approxMaxLastHourSessionsPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `Session`s in the last hour, which is over the limit (%d)",
              userId, recentCount, approxMaxLastHourSessionsPerUser));
    }
  }

  void checkOtpParamsPerUser(EntityManager entityManager, long userId, int toAdd) {
    long otpParamsCount =
        Queries.countRowsByValue(entityManager, OtpParams.class, OtpParams_.user, userId);
    if (otpParamsCount + toAdd > approxMaxOtpParamsPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `OtpParams`, which is over the limit (%d)",
              userId, otpParamsCount, approxMaxOtpParamsPerUser));
    }
  }
}
