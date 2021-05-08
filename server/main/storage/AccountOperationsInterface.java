package server.main.storage;

import server.main.entities.MailToken;
import server.main.entities.Session;
import server.main.entities.User;
import server.main.proto.service.IdentifiedKey;

import java.util.List;
import java.util.Optional;

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
}
