package com.floreina.keyring.database;

import com.floreina.keyring.IdentifiedKey;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;

import java.util.List;
import java.util.Optional;

public interface AccountingInterface {
  User createUser(String username, String salt, String digest, String mail, String code);

  Optional<MailToken> getMailToken(long userIdentifier, String token);

  void releaseMailToken(long tokenIdentifier);

  Optional<User> getUserByName(String username);

  Optional<User> getUserByIdentifier(long identifier);

  void changeMasterKey(long userIdentifier, String salt, String digest, List<IdentifiedKey> protos);

  void createSession(long userIdentifier, String key, String ipAddress, String userAgent);

  List<Session> readSessions(long userIdentifier);
}
