package com.floreina.keyring.storage;

import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.proto.service.IdentifiedKey;

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
