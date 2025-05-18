package keyring.server.main.storage;

import static java.util.stream.Collectors.toMap;
import static keyring.server.main.storage.AccountOperationsInterface.MtNudgeStatus;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import keyring.server.main.Chronometry;
import keyring.server.main.aspects.Annotations.ContextualEntityManager;
import keyring.server.main.aspects.Annotations.LockEntity;
import keyring.server.main.aspects.Annotations.WithEntityTransaction;
import keyring.server.main.entities.FeaturePrompts;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.Key_;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.MailToken_;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.OtpParams_;
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.OtpToken_;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.Session_;
import keyring.server.main.entities.User;
import keyring.server.main.entities.User_;
import keyring.server.main.entities.columns.MailTokenState;
import keyring.server.main.entities.columns.SessionStage;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.proto.service.FeatureType;
import keyring.server.main.proto.service.KeyPatch;
import keyring.server.main.proto.service.Password;

public class AccountOperationsClient implements AccountOperationsInterface {
  private static final ImmutableMap<FeatureType, Consumer<FeaturePrompts>> FEATURE_PROMPT_ACKERS =
      ImmutableMap.of(FeatureType.RELEASE, featurePrompts -> featurePrompts.setRelease(false));

  private Chronometry chronometry;
  private Limiters limiters;
  private final int initialSpareAttempts;

  @ContextualEntityManager private EntityManager entityManager;

  AccountOperationsClient(Chronometry chronometry, Limiters limiters, int initialSpareAttempts) {
    this.chronometry = chronometry;
    this.limiters = limiters;
    this.initialSpareAttempts = initialSpareAttempts;
  }

  @Override
  @WithEntityTransaction
  public Tuple2<User, MailToken> createUser(
      String username, String salt, String hash, String ipAddress, String mail, String code) {
    limiters.checkMailTokensPerIpAddress(entityManager, ipAddress, /* toAdd */ 1);
    User user =
        new User()
            .setState(UserState.USER_PENDING)
            .setUsername(username)
            .setSalt(salt)
            .setHash(hash);
    FeaturePrompts featurePrompts = new FeaturePrompts().setUser(user);
    MailToken mailToken =
        new MailToken()
            .setUser(user)
            .setMail(mail)
            .setCode(code)
            .setState(MailTokenState.MAIL_TOKEN_PENDING);
    entityManager.persist(user);
    entityManager.persist(featurePrompts);
    entityManager.persist(mailToken);
    return Tuple.of(user, mailToken);
  }

  @Override
  @WithEntityTransaction
  public MailToken createMailToken(long userId, String ipAddress, String mail, String code) {
    limiters.checkMailTokensPerIpAddress(entityManager, ipAddress, /* toAdd */ 1);
    limiters.checkMailTokensPerUser(entityManager, userId, /* toAdd */ 1);
    MailToken mailToken =
        new MailToken()
            .setUser(entityManager.getReference(User.class, userId))
            .setMail(mail)
            .setCode(code)
            .setState(MailTokenState.MAIL_TOKEN_PENDING);
    entityManager.persist(mailToken);
    return mailToken;
  }

  @Override
  @WithEntityTransaction
  public Optional<MailToken> getMailToken(long userId, long tokenId) {
    return Queries.findManyToOne(entityManager, MailToken.class, MailToken_.user, userId).stream()
        .filter(mailToken -> Objects.equals(mailToken.getIdentifier(), tokenId))
        .filter(mailToken -> mailToken.isAvailable(chronometry))
        .findFirst();
  }

  @Override
  @WithEntityTransaction
  public Optional<MailToken> latestMailToken(long userIdentifier) {
    return Queries.findManyToOne(entityManager, MailToken.class, MailToken_.user, userIdentifier)
        .stream()
        .filter(mailToken -> mailToken.isAvailable(chronometry))
        .max((left, right) -> left.getTimestamp().compareTo(right.getTimestamp()));
  }

  @LockEntity(name = "mailToken")
  private void _acceptMailToken(MailToken mailToken) {
    MailTokenState mailTokenState = mailToken.getState();
    if (!Objects.equals(mailTokenState, MailTokenState.MAIL_TOKEN_PENDING)) {
      throw new IllegalArgumentException(
          String.format(
              "MailToken %d cannot be released, its state is %s",
              mailToken.getIdentifier(), mailTokenState));
    }
    mailToken.setState(MailTokenState.MAIL_TOKEN_ACCEPTED);
    entityManager.persist(mailToken);
  }

  @LockEntity(name = "user")
  private void _releaseMailToken(User user, MailToken mailToken) {
    UserState userState = user.getState();
    if (!ImmutableList.of(UserState.USER_PENDING, UserState.USER_ACTIVE).contains(userState)) {
      throw new IllegalArgumentException(
          String.format(
              "User %d cannot `releaseMailToken`, their state is %s",
              user.getIdentifier(), userState));
    }
    _acceptMailToken(mailToken);
    user.setMail(mailToken.getMail());
    if (user.isActivated()) {
      user.setState(UserState.USER_ACTIVE);
    }
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void releaseMailToken(long userId, long tokenId) {
    Optional<MailToken> maybeMailToken =
        Optional.ofNullable(entityManager.find(MailToken.class, tokenId));
    if (!maybeMailToken.isPresent()) {
      throw new IllegalArgumentException(String.format("`MailToken` %d does not exist", tokenId));
    }
    MailToken mailToken = maybeMailToken.get();
    User user = mailToken.getUser();
    if (!Objects.equals(user.getIdentifier(), userId)) {
      throw new IllegalArgumentException(
          String.format("`MailToken` %d does not belong to user %d", tokenId, userId));
    }
    _releaseMailToken(user, mailToken);
  }

  @Override
  @WithEntityTransaction
  public Optional<User> getUserByName(String username) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<User> criteriaQuery = criteriaBuilder.createQuery(User.class);
    Root<User> root = criteriaQuery.from(User.class);
    criteriaQuery.select(root).where(criteriaBuilder.equal(root.get(User_.username), username));
    return entityManager.createQuery(criteriaQuery).getResultList().stream().findFirst();
  }

  @WithEntityTransaction
  public Optional<User> getUserById(long identifier) {
    // https://stackoverflow.com/a/13569657
    return Optional.ofNullable(entityManager.find(User.class, identifier));
  }

  @LockEntity(name = "user")
  private List<Session> _changeMasterKey(
      User user, String salt, String hash, List<KeyPatch> patches) {
    long userId = user.getIdentifier();
    // Concurrent `Session` creation is blocked by `User` version update.
    // `createSession` requires both `userId` and `userVersion`.
    List<Session> sessions =
        readSessions(userId, Optional.of(ImmutableList.of(SessionStage.SESSION_DISABLED)));
    Instant now = chronometry.currentTime();
    for (Session session : sessions) {
      // Implicitly causes version increment.
      session.setStage(SessionStage.SESSION_DISABLED, now);
      entityManager.persist(session);
    }
    user.setSalt(salt);
    user.setHash(hash);
    entityManager.persist(user);
    // Concurrent `Key` creation is blocked by `Session` invalidation above.
    List<Key> keys = Queries.findManyToOne(entityManager, Key.class, Key_.user, userId);
    Map<Long, Password> keyIdToPatch =
        patches.stream().collect(toMap(KeyPatch::getIdentifier, KeyPatch::getPassword));
    for (Key key : keys) {
      long keyId = key.getIdentifier();
      Optional<Password> maybePatch = Optional.ofNullable(keyIdToPatch.get(keyId));
      if (!maybePatch.isPresent()) {
        throw new IllegalArgumentException(String.format("Missing `KeyPatch` for key %d", keyId));
      }
      Password patch = maybePatch.get();
      key.mergeFromPassword(patch);
      entityManager.persist(key);
    }
    return sessions;
  }

  @Override
  @WithEntityTransaction
  public List<Session> changeMasterKey(
      long userId, String salt, String hash, List<KeyPatch> protos) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    return _changeMasterKey(maybeUser.get(), salt, hash, protos);
  }

  private void _changeUsername(User user, String username) {
    user.setUsername(username);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void changeUsername(long userId, String username) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    _changeUsername(maybeUser.get(), username);
  }

  @LockEntity(name = "user")
  private Session _createSession(
      User user, long version, String ipAddress, String userAgent, String clientVersion) {
    long actualVersion = user.getVersion();
    if (actualVersion != version) {
      throw new IllegalArgumentException(
          String.format(
              "Version mismatch for user %d: %d (given) is not %d (actual)",
              user.getIdentifier(), version, actualVersion));
    }
    Session session =
        new Session()
            .setUser(user)
            .setStage(SessionStage.UNKNOWN_SESSION_STAGE, chronometry.currentTime())
            .setIpAddress(ipAddress)
            .setUserAgent(userAgent)
            .setClientVersion(clientVersion);
    entityManager.persist(session);
    return session;
  }

  @Override
  @WithEntityTransaction
  public Session createSession(
      long userId, long userVersion, String ipAddress, String userAgent, String clientVersion) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    limiters.checkRecentSessionsPerUser(chronometry, entityManager, userId, /* toAdd */ 1);
    return _createSession(maybeUser.get(), userVersion, ipAddress, userAgent, clientVersion);
  }

  @Override
  @WithEntityTransaction
  public Session mustGetSession(long userId, long sessionId) {
    Optional<Session> maybeSession =
        Optional.ofNullable(entityManager.find(Session.class, sessionId));
    if (!maybeSession.isPresent()) {
      throw new IllegalArgumentException(String.format("`Session` %d does not exist", sessionId));
    }
    Session session = maybeSession.get();
    User user = session.getUser();
    if (!Objects.equals(user.getIdentifier(), userId)) {
      throw new IllegalArgumentException(
          String.format("Session %d does not belong to user %d", sessionId, userId));
    }
    return session;
  }

  @LockEntity(name = "session")
  private void _initiateSession(Session session, String key) {
    if (session.getStage() != SessionStage.UNKNOWN_SESSION_STAGE) {
      throw new IllegalArgumentException(
          String.format(
              "Session %d cannot be initiated, `SessionStage` is %s",
              session.getIdentifier(), session.getStage().getValueDescriptor().getName()));
    }
    session.setKey(key);
    session.setStage(SessionStage.SESSION_INITIATED, chronometry.currentTime());
    entityManager.persist(session);
  }

  @Override
  @WithEntityTransaction
  public void initiateSession(long userId, long sessionId, String key) {
    Session session = mustGetSession(userId, sessionId);
    _initiateSession(session, key);
  }

  @LockEntity(name = "session")
  private void _activateSession(Session session, String key) {
    if (!ImmutableList.of(SessionStage.UNKNOWN_SESSION_STAGE, SessionStage.SESSION_INITIATED)
        .contains(session.getStage())) {
      throw new IllegalArgumentException(
          String.format(
              "Session %d cannot be activated, `SessionStage` is %s",
              session.getIdentifier(), session.getStage().getValueDescriptor().getName()));
    }
    session.setKey(key);
    session.setStage(SessionStage.SESSION_ACTIVATED, chronometry.currentTime());
    entityManager.persist(session);
  }

  private void _updateLastSession(User user, Instant instant) {
    user.setLastSession(instant);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void activateSession(long userId, long sessionId, String key) {
    Session session = mustGetSession(userId, sessionId);
    _activateSession(session, key);
    _updateLastSession(session.getUser(), session.getTimestamp());
  }

  private List<Session> _readSessions(User user, Optional<List<SessionStage>> exceptStages) {
    long userId = user.getIdentifier();
    List<Session> allSessions =
        Queries.findManyToOne(entityManager, Session.class, Session_.user, userId);
    if (!exceptStages.isPresent()) {
      return allSessions;
    }
    List<SessionStage> exclusions = exceptStages.get();
    ImmutableList.Builder<Session> listBuilder = ImmutableList.builder();
    for (Session session : allSessions) {
      if (!exclusions.contains(session.getStage())) {
        listBuilder.add(session);
      }
    }
    return listBuilder.build();
  }

  @Override
  @WithEntityTransaction
  public List<Session> readSessions(long userId, Optional<List<SessionStage>> exceptStages) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    return _readSessions(maybeUser.get(), exceptStages);
  }

  private void _markAccountAsDeleted(User user) {
    user.setState(UserState.USER_DELETED);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void markAccountAsDeleted(long userId) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    _markAccountAsDeleted(maybeUser.get());
  }

  @Override
  @WithEntityTransaction
  public OtpParams createOtpParams(long userId, String sharedSecret, List<String> scratchCodes) {
    limiters.checkOtpParamsPerUser(entityManager, userId, /* toAdd */ 1);
    OtpParams otpParams =
        new OtpParams()
            // Currently allowed even if `User` already has `otpSharedSecret`.
            .setUser(entityManager.getReference(User.class, userId))
            .setOtpSharedSecret(sharedSecret)
            .setScratchCodes(scratchCodes);
    entityManager.persist(otpParams);
    return otpParams;
  }

  @Override
  @WithEntityTransaction
  public Optional<OtpParams> getOtpParams(long userId, long otpParamsId) {
    return Queries.findManyToOne(entityManager, OtpParams.class, OtpParams_.user, userId).stream()
        .filter(otpParams -> Objects.equals(otpParams.getId(), otpParamsId))
        .findFirst();
  }

  @LockEntity(name = "user")
  private void _acceptOtpParams(User user, OtpParams otpParams) {
    if (user.getOtpSharedSecret() != null) {
      throw new IllegalArgumentException(
          String.format("User %d already has 2FA enabled", user.getIdentifier()));
    }
    user.setOtpSharedSecret(otpParams.getOtpSharedSecret());
    user.setOtpSpareAttempts(initialSpareAttempts);
    entityManager.persist(user);
    for (String scratchCode : otpParams.getScratchCodes()) {
      entityManager.persist(new OtpToken().setUser(user).setIsInitial(true).setValue(scratchCode));
    }
    entityManager.remove(otpParams);
  }

  @Override
  @WithEntityTransaction
  public void acceptOtpParams(long userId, long otpParamsId) {
    Optional<OtpParams> maybeOtpParams =
        Optional.ofNullable(entityManager.find(OtpParams.class, otpParamsId));
    if (!maybeOtpParams.isPresent()) {
      throw new IllegalArgumentException(String.format("`OtpParams` %d do not exist", otpParamsId));
    }
    OtpParams otpParams = maybeOtpParams.get();
    User user = otpParams.getUser();
    if (!Objects.equals(user.getIdentifier(), userId)) {
      throw new IllegalArgumentException(
          String.format("`OtpParams` %d do not belong to user %d", otpParamsId, userId));
    }
    _acceptOtpParams(user, otpParams);
  }

  @LockEntity(name = "user")
  private void _createTrustedToken(User user, String otpToken) {
    if (user.getOtpSharedSecret() == null) {
      throw new IllegalArgumentException(
          String.format("User %d does not have 2FA enabled", user.getIdentifier()));
    }
    entityManager.persist(new OtpToken().setUser(user).setIsInitial(false).setValue(otpToken));
  }

  @Override
  @WithEntityTransaction
  public void createTrustedToken(long userId, String otpToken) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    // `OtpToken` limits are implied by `Session` limits.
    _createTrustedToken(maybeUser.get(), otpToken);
  }

  @Override
  @WithEntityTransaction
  public Optional<OtpToken> getOtpToken(long userId, String value, boolean mustBeInitial) {
    return Queries.findManyToOne(entityManager, OtpToken.class, OtpToken_.user, userId).stream()
        .filter(
            otpParams ->
                Objects.equals(otpParams.getValue(), value)
                    && (!mustBeInitial || otpParams.getIsInitial()))
        .findFirst();
  }

  @Override
  @WithEntityTransaction
  public void deleteOtpToken(long userId, long tokenId) {
    Optional<OtpToken> maybeOtpToken =
        Optional.ofNullable(entityManager.find(OtpToken.class, tokenId));
    if (!maybeOtpToken.isPresent()) {
      throw new IllegalArgumentException(String.format("`OtpToken` %d does not exist", tokenId));
    }
    OtpToken otpToken = maybeOtpToken.get();
    if (!Objects.equals(otpToken.getUser().getIdentifier(), userId)) {
      throw new IllegalArgumentException(
          String.format("`OtpToken` %d does not belong to user %d", tokenId, userId));
    }
    entityManager.remove(otpToken);
  }

  @LockEntity(name = "user")
  private void _resetOtp(User user) {
    user.setOtpSharedSecret(null);
    user.setOtpSpareAttempts(0);
    entityManager.persist(user);
    // Concurrent `OtpToken` creation is blocked by `otpSharedSecret` set to `null`.
    List<OtpToken> otpTokens =
        Queries.findManyToOne(entityManager, OtpToken.class, OtpToken_.user, user.getIdentifier());
    for (OtpToken otpToken : otpTokens) {
      entityManager.remove(otpToken);
    }
  }

  @Override
  @WithEntityTransaction
  public void resetOtp(long userId) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    _resetOtp(maybeUser.get());
  }

  @LockEntity(name = "user")
  private Optional<Integer> _acquireOtpSpareAttempt(User user) {
    if (user.getOtpSharedSecret() == null) {
      throw new IllegalArgumentException(
          String.format("User %d does not have 2FA enabled", user.getIdentifier()));
    }
    int attemptsLeft = user.getOtpSpareAttempts();
    user.decrementOtpSpareAttempts();
    entityManager.persist(user);
    return Optional.of(attemptsLeft - 1);
  }

  @Override
  @WithEntityTransaction
  public Optional<Integer> acquireOtpSpareAttempt(long userId) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    User user = maybeUser.get();
    if (user.getOtpSpareAttempts() == 0) {
      return Optional.empty();
    }
    return _acquireOtpSpareAttempt(maybeUser.get());
  }

  @LockEntity(name = "user")
  private void _restoreOtpSpareAttempts(User user) {
    if (user.getOtpSharedSecret() == null) {
      throw new IllegalArgumentException(
          String.format("User %d does not have 2FA enabled", user.getIdentifier()));
    }
    user.setOtpSpareAttempts(initialSpareAttempts);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void restoreOtpSpareAttempts(long userId) {
    Optional<User> maybeUser = getUserById(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException(String.format("`User` %d does not exist", userId));
    }
    _restoreOtpSpareAttempts(maybeUser.get());
  }

  @Override
  @WithEntityTransaction
  public FeaturePrompts getFeaturePrompts(long userId) {
    Optional<FeaturePrompts> maybeFeaturePrompts =
        Optional.ofNullable(entityManager.find(FeaturePrompts.class, userId));
    if (!maybeFeaturePrompts.isPresent()) {
      throw new IllegalArgumentException(
          String.format("`FeaturePrompts` for user %d do not exist", userId));
    }
    return maybeFeaturePrompts.get();
  }

  @Override
  @WithEntityTransaction
  public void ackFeaturePrompt(long userId, FeatureType featureType) {
    FeaturePrompts featurePrompts = getFeaturePrompts(userId);
    Consumer<FeaturePrompts> consumer = FEATURE_PROMPT_ACKERS.get(featureType);
    if (consumer == null) {
      throw new IllegalStateException(String.format("Unknown `FeatureType` %s", featureType));
    }
    consumer.accept(featurePrompts);
    entityManager.persist(featurePrompts);
  }

  @LockEntity(name = "mailToken")
  private Tuple2<MtNudgeStatus, Optional<MailToken>> _nudgeMailToken(
      MailToken mailToken, BiFunction<Instant, Integer, Instant> nextAvailabilityInstant) {
    Instant availabilityInstant =
        nextAvailabilityInstant.apply(mailToken.getLastAttempt(), mailToken.getAttemptCount());
    Instant currentTime = chronometry.currentTime();
    if (!availabilityInstant.isBefore(currentTime)) {
      return Tuple.of(MtNudgeStatus.NOT_AVAILABLE_YET, Optional.empty());
    }
    mailToken.setLastAttempt(currentTime);
    mailToken.incrementAttemptCount();
    entityManager.persist(mailToken);
    return Tuple.of(MtNudgeStatus.OK, Optional.of(mailToken));
  }

  @Override
  @WithEntityTransaction
  public Tuple2<MtNudgeStatus, Optional<MailToken>> nudgeMailToken(
      long userId, long tokenId, BiFunction<Instant, Integer, Instant> nextAvailabilityInstant) {
    Optional<MailToken> maybeMailToken = getMailToken(userId, tokenId);
    if (!maybeMailToken.isPresent()) {
      return Tuple.of(MtNudgeStatus.NOT_FOUND, Optional.empty());
    }
    return _nudgeMailToken(maybeMailToken.get(), nextAvailabilityInstant);
  }
}
