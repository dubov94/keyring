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
  private final long approxMaxMailTokensPerAddress;
  private final long approxMaxRecentSessionsPerUser;
  private final long approxMaxOtpParamsPerUser;

  Limiters(
      long approxMaxKeysPerUser,
      long approxMaxMailTokensPerUser,
      long approxMaxMailTokensPerAddress,
      long approxMaxRecentSessionsPerUser,
      long approxMaxOtpParamsPerUser) {
    this.approxMaxKeysPerUser = approxMaxKeysPerUser;
    this.approxMaxMailTokensPerUser = approxMaxMailTokensPerUser;
    this.approxMaxMailTokensPerAddress = approxMaxMailTokensPerAddress;
    this.approxMaxRecentSessionsPerUser = approxMaxRecentSessionsPerUser;
    this.approxMaxOtpParamsPerUser = approxMaxOtpParamsPerUser;
  }

  void checkKeysPerUser(EntityManager entityManager, long userId) {
    long keyCount = Queries.countRowsByValue(entityManager, Key.class, Key_.user, userId);
    if (keyCount > approxMaxKeysPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `Key`s, which is over the limit (%d)",
              userId, keyCount, approxMaxKeysPerUser));
    }
  }

  void checkMailTokensPerUser(EntityManager entityManager, long userId) {
    long mailTokenCount =
        Queries.countRowsByValue(entityManager, MailToken.class, MailToken_.user, userId);
    if (mailTokenCount > approxMaxMailTokensPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `MailToken`s, which is over the limit (%d)",
              userId, mailTokenCount, approxMaxMailTokensPerUser));
    }
  }

  void checkMailTokensPerAddress(EntityManager entityManager, String address) {
    long mailTokenCount =
        Queries.countRowsByValue(entityManager, MailToken.class, MailToken_.mail, address);
    if (mailTokenCount > approxMaxMailTokensPerAddress) {
      throw new IllegalStateException(
          String.format(
              "Address [redacted] has been requested %d times, which is over the limit (%d)",
              mailTokenCount, approxMaxMailTokensPerAddress));
    }
  }

  void checkRecentSessionsPerUser(
      Chronometry chronometry, EntityManager entityManager, long userId) {
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
    if (recentCount > approxMaxRecentSessionsPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `Session`s in the last hour, which is over the limit (%d)",
              userId, recentCount, approxMaxRecentSessionsPerUser));
    }
  }

  void checkOtpParamsPerUser(EntityManager entityManager, long userId) {
    long otpParamsCount =
        Queries.countRowsByValue(entityManager, OtpParams.class, OtpParams_.user, userId);
    if (otpParamsCount > approxMaxOtpParamsPerUser) {
      throw new IllegalStateException(
          String.format(
              "User %d has %d `OtpParams`, which is over the limit (%d)",
              userId, otpParamsCount, approxMaxOtpParamsPerUser));
    }
  }
}
