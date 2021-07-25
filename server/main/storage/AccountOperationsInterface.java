package server.main.storage;

import java.util.List;
import java.util.Optional;
import server.main.entities.FeaturePrompts;
import server.main.entities.MailToken;
import server.main.entities.OtpParams;
import server.main.entities.OtpToken;
import server.main.entities.Session;
import server.main.entities.User;
import server.main.proto.service.FeatureType;
import server.main.proto.service.IdentifiedKey;

public interface AccountOperationsInterface {
  User createUser(String username, String salt, String hash, String mail, String code);

  void createMailToken(long userIdentifier, String mail, String code);

  Optional<MailToken> getMailToken(long userIdentifier, String token);

  void releaseMailToken(long tokenIdentifier);

  Optional<User> getUserByName(String username);

  Optional<User> getUserByIdentifier(long identifier);

  void changeMasterKey(long userIdentifier, String salt, String hash, List<IdentifiedKey> protos);

  void changeUsername(long userIdentifier, String username);

  void createSession(long userIdentifier, String key, String ipAddress, String userAgent);

  List<Session> readSessions(long userIdentifier);

  void markAccountAsDeleted(long userIdentifier);

  OtpParams createOtpParams(long userIdentifier, String sharedSecret, List<String> scratchCodes);

  Optional<OtpParams> getOtpParams(long userId, long otpParamsId);

  void acceptOtpParams(long otpParamsId);

  void createOtpToken(long userId, String otpToken);

  Optional<OtpToken> getOtpToken(long userId, String value, boolean mustBeInitial);

  void deleteOtpToken(long tokenId);

  void resetOtp(long userId);

  Optional<Integer> acquireOtpSpareAttempt(long userId);

  void restoreOtpSpareAttempts(long userId);

  FeaturePrompts getFeaturePrompts(long userId);

  void ackFeaturePrompt(long userId, FeatureType featureType);
}
