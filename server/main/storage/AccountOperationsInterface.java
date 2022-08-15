package server.main.storage;

import io.vavr.Tuple2;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import server.main.entities.FeaturePrompts;
import server.main.entities.MailToken;
import server.main.entities.OtpParams;
import server.main.entities.OtpToken;
import server.main.entities.Session;
import server.main.entities.User;
import server.main.proto.service.FeatureType;
import server.main.proto.service.KeyPatch;

public interface AccountOperationsInterface {
  Tuple2<User, MailToken> createUser(
      String username, String salt, String hash, String mail, String code);

  MailToken createMailToken(long userIdentifier, String mail, String code);

  Optional<MailToken> getMailToken(long userId, long tokenId);

  Optional<MailToken> latestMailToken(long userIdentifier);

  void releaseMailToken(long userId, long tokenIdentifier);

  Optional<User> getUserByName(String username);

  Optional<User> getUserByIdentifier(long identifier);

  void changeMasterKey(long userIdentifier, String salt, String hash, List<KeyPatch> protos);

  void changeUsername(long userIdentifier, String username);

  void createSession(
      long userIdentifier, String key, String ipAddress, String userAgent, String clientVersion);

  List<Session> readSessions(long userIdentifier);

  void markAccountAsDeleted(long userIdentifier);

  OtpParams createOtpParams(long userIdentifier, String sharedSecret, List<String> scratchCodes);

  Optional<OtpParams> getOtpParams(long userId, long otpParamsId);

  void acceptOtpParams(long userId, long otpParamsId);

  void createOtpToken(long userId, String otpToken);

  Optional<OtpToken> getOtpToken(long userId, String value, boolean mustBeInitial);

  void deleteOtpToken(long userId, long tokenId);

  void resetOtp(long userId);

  Optional<Integer> acquireOtpSpareAttempt(long userId);

  void restoreOtpSpareAttempts(long userId);

  FeaturePrompts getFeaturePrompts(long userId);

  void ackFeaturePrompt(long userId, FeatureType featureType);

  public enum NudgeStatus {
    OK,
    NOT_FOUND,
    NOT_AVAILABLE_YET
  }

  Tuple2<NudgeStatus, Optional<MailToken>> nudgeMailToken(
      long userId, long tokenId, BiFunction<Instant, Integer, Instant> nextAvailabilityInstant);
}
