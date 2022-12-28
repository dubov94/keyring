package keyring.server.main.storage;

import io.vavr.Tuple2;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;
import keyring.server.main.entities.FeaturePrompts;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.SessionStage;
import keyring.server.main.proto.service.FeatureType;
import keyring.server.main.proto.service.KeyPatch;

public interface AccountOperationsInterface {
  Tuple2<User, MailToken> createUser(
      String username, String salt, String hash, String mail, String code);

  MailToken createMailToken(long userIdentifier, String mail, String code);

  Optional<MailToken> getMailToken(long userId, long tokenId);

  Optional<MailToken> latestMailToken(long userIdentifier);

  void releaseMailToken(long userId, long tokenId);

  Optional<User> getUserByName(String username);

  Optional<User> getUserById(long identifier);

  List<Session> changeMasterKey(long userId, String salt, String hash, List<KeyPatch> protos);

  void changeUsername(long userId, String username);

  Session createSession(
      long userId, long userVersion, String ipAddress, String userAgent, String clientVersion);

  Session mustGetSession(long userId, long sessionId);

  void initiateSession(long userId, long sessionId, String key);

  void activateSession(long userId, long sessionId, String key);

  List<Session> readSessions(long userId, Optional<List<SessionStage>> exceptStages);

  void markAccountAsDeleted(long userId);

  OtpParams createOtpParams(long userId, String sharedSecret, List<String> scratchCodes);

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

  public enum MtNudgeStatus {
    OK,
    NOT_FOUND,
    NOT_AVAILABLE_YET
  }

  Tuple2<MtNudgeStatus, Optional<MailToken>> nudgeMailToken(
      long userId, long tokenId, BiFunction<Instant, Integer, Instant> nextAvailabilityInstant);
}
