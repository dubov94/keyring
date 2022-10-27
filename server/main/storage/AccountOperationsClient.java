package server.main.storage;

import static java.util.stream.Collectors.toMap;
import static server.main.storage.AccountOperationsInterface.NudgeStatus;

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
import server.main.Chronometry;
import server.main.aspects.Annotations.ContextualEntityManager;
import server.main.aspects.Annotations.LockEntity;
import server.main.aspects.Annotations.WithEntityTransaction;
import server.main.entities.*;
import server.main.proto.service.FeatureType;
import server.main.proto.service.KeyPatch;
import server.main.proto.service.Password;

public class AccountOperationsClient implements AccountOperationsInterface {
  private static final int INITIAL_SPARE_ATTEMPTS = 5;
  private static final ImmutableMap<FeatureType, Consumer<FeaturePrompts>> FEATURE_PROMPT_ACKERS =
      ImmutableMap.of(
          FeatureType.OTP,
          featurePrompts -> featurePrompts.setOtp(false),
          FeatureType.FUZZY_SEARCH,
          featurePrompts -> featurePrompts.setFuzzySearch(false));

  private Chronometry chronometry;
  @ContextualEntityManager private EntityManager entityManager;

  AccountOperationsClient(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @Override
  @WithEntityTransaction
  public Tuple2<User, MailToken> createUser(
      String username, String salt, String hash, String mail, String code) {
    User user =
        new User().setState(User.State.PENDING).setUsername(username).setSalt(salt).setHash(hash);
    FeaturePrompts featurePrompts = new FeaturePrompts().setUser(user);
    MailToken mailToken = new MailToken().setUser(user).setMail(mail).setCode(code);
    entityManager.persist(user);
    entityManager.persist(featurePrompts);
    entityManager.persist(mailToken);
    return Tuple.of(user, mailToken);
  }

  @Override
  @WithEntityTransaction
  public MailToken createMailToken(long userIdentifier, String mail, String code) {
    MailToken mailToken =
        new MailToken()
            .setUser(entityManager.getReference(User.class, userIdentifier))
            .setMail(mail)
            .setCode(code);
    entityManager.persist(mailToken);
    return mailToken;
  }

  @Override
  @WithEntityTransaction
  public Optional<MailToken> getMailToken(long userId, long tokenId) {
    return Queries.findManyToOne(entityManager, MailToken.class, MailToken_.user, userId).stream()
        .filter(mailToken -> Objects.equals(mailToken.getIdentifier(), tokenId))
        .findFirst();
  }

  @Override
  @WithEntityTransaction
  public Optional<MailToken> latestMailToken(long userIdentifier) {
    return Queries.findManyToOne(entityManager, MailToken.class, MailToken_.user, userIdentifier)
        .stream()
        .max((left, right) -> left.getTimestamp().compareTo(right.getTimestamp()));
  }

  @LockEntity(name = "user")
  private void _releaseMailToken(User user, MailToken mailToken) {
    user.setMail(mailToken.getMail());
    if (user.isActivated()) {
      user.setState(User.State.ACTIVE);
    }
    entityManager.persist(user);
    entityManager.remove(mailToken);
  }

  @Override
  @WithEntityTransaction
  public void releaseMailToken(long userId, long tokenIdentifier) {
    Optional<MailToken> maybeMailToken =
        Optional.ofNullable(entityManager.find(MailToken.class, tokenIdentifier));
    if (!maybeMailToken.isPresent()) {
      throw new IllegalArgumentException();
    }
    MailToken mailToken = maybeMailToken.get();
    User user = mailToken.getUser();
    if (!Objects.equals(user.getIdentifier(), userId)) {
      throw new IllegalArgumentException();
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
  public Optional<User> getUserByIdentifier(long identifier) {
    // https://stackoverflow.com/a/13569657
    return Optional.ofNullable(entityManager.find(User.class, identifier));
  }

  @LockEntity(name = "user")
  private void _changeMasterKey(User user, String salt, String hash, List<KeyPatch> patches) {
    user.setSalt(salt);
    user.setHash(hash);
    entityManager.persist(user);
    // Key creation is guarded by `User` lock.
    List<Key> keys =
        Queries.findManyToOne(entityManager, Key.class, Key_.user, user.getIdentifier());
    Map<Long, Password> keyIdToPatch =
        patches.stream().collect(toMap(KeyPatch::getIdentifier, KeyPatch::getPassword));
    for (Key key : keys) {
      Optional<Password> maybePatch = Optional.ofNullable(keyIdToPatch.get(key.getIdentifier()));
      if (!maybePatch.isPresent()) {
        throw new IllegalArgumentException();
      }
      Password patch = maybePatch.get();
      // Implicitly causes version increment.
      key.mergeFromPassword(patch);
      entityManager.persist(key);
    }
  }

  @Override
  @WithEntityTransaction
  public void changeMasterKey(
      long userIdentifier, String salt, String hash, List<KeyPatch> protos) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _changeMasterKey(maybeUser.get(), salt, hash, protos);
  }

  @LockEntity(name = "user")
  private void _changeUsername(User user, String username) {
    user.setUsername(username);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void changeUsername(long userIdentifier, String username) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _changeUsername(maybeUser.get(), username);
  }

  @LockEntity(name = "user")
  private void _createSession(
      User user, String key, String ipAddress, String userAgent, String clientVersion) {
    user.setLastSession(chronometry.currentTime());
    entityManager.persist(user);
    Session session =
        new Session()
            .setUser(user)
            .setKey(key)
            .setIpAddress(ipAddress)
            .setUserAgent(userAgent)
            .setClientVersion(clientVersion);
    entityManager.persist(session);
  }

  @Override
  @WithEntityTransaction
  public void createSession(
      long userIdentifier, String key, String ipAddress, String userAgent, String clientVersion) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _createSession(maybeUser.get(), key, ipAddress, userAgent, clientVersion);
  }

  @Override
  @WithEntityTransaction
  public List<Session> readSessions(long userIdentifier) {
    return Queries.findManyToOne(entityManager, Session.class, Session_.user, userIdentifier);
  }

  @LockEntity(name = "user")
  private void _markAccountAsDeleted(User user) {
    user.setState(User.State.DELETED);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void markAccountAsDeleted(long userIdentifier) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _markAccountAsDeleted(maybeUser.get());
  }

  @Override
  @WithEntityTransaction
  public OtpParams createOtpParams(
      long userIdentifier, String sharedSecret, List<String> scratchCodes) {
    OtpParams otpParams =
        new OtpParams()
            .setUser(entityManager.getReference(User.class, userIdentifier))
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
      throw new IllegalArgumentException();
    }
    user.setOtpSharedSecret(otpParams.getOtpSharedSecret());
    user.setOtpSpareAttempts(INITIAL_SPARE_ATTEMPTS);
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
      throw new IllegalArgumentException();
    }
    OtpParams otpParams = maybeOtpParams.get();
    User user = otpParams.getUser();
    if (!Objects.equals(user.getIdentifier(), userId)) {
      throw new IllegalArgumentException();
    }
    _acceptOtpParams(user, otpParams);
  }

  @LockEntity(name = "user")
  private void _createOtpToken(User user, String otpToken) {
    if (user.getOtpSharedSecret() == null) {
      throw new IllegalArgumentException();
    }
    entityManager.persist(new OtpToken().setUser(user).setIsInitial(false).setValue(otpToken));
  }

  @Override
  @WithEntityTransaction
  public void createOtpToken(long userId, String otpToken) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _createOtpToken(maybeUser.get(), otpToken);
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
      throw new IllegalArgumentException();
    }
    OtpToken otpToken = maybeOtpToken.get();
    if (!Objects.equals(otpToken.getUser().getIdentifier(), userId)) {
      throw new IllegalArgumentException();
    }
    entityManager.remove(otpToken);
  }

  @LockEntity(name = "user")
  private void _resetOtp(User user) {
    user.setOtpSharedSecret(null);
    user.setOtpSpareAttempts(0);
    entityManager.persist(user);
    // Token creation is guarded by `User` lock.
    List<OtpToken> otpTokens =
        Queries.findManyToOne(entityManager, OtpToken.class, OtpToken_.user, user.getIdentifier());
    for (OtpToken otpToken : otpTokens) {
      entityManager.remove(otpToken);
    }
  }

  @Override
  @WithEntityTransaction
  public void resetOtp(long userId) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _resetOtp(maybeUser.get());
  }

  @LockEntity(name = "user")
  private Optional<Integer> _acquireOtpSpareAttempt(User user) {
    int attemptsLeft = user.getOtpSpareAttempts();
    user.decrementOtpSpareAttempts();
    entityManager.persist(user);
    return Optional.of(attemptsLeft - 1);
  }

  @Override
  @WithEntityTransaction
  public Optional<Integer> acquireOtpSpareAttempt(long userId) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
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
      throw new IllegalArgumentException();
    }
    user.setOtpSpareAttempts(INITIAL_SPARE_ATTEMPTS);
    entityManager.persist(user);
  }

  @Override
  @WithEntityTransaction
  public void restoreOtpSpareAttempts(long userId) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    _restoreOtpSpareAttempts(maybeUser.get());
  }

  @Override
  @WithEntityTransaction
  public FeaturePrompts getFeaturePrompts(long userId) {
    Optional<FeaturePrompts> maybeFeaturePrompts =
        Optional.ofNullable(entityManager.find(FeaturePrompts.class, userId));
    if (!maybeFeaturePrompts.isPresent()) {
      throw new IllegalArgumentException();
    }
    return maybeFeaturePrompts.get();
  }

  @Override
  @WithEntityTransaction
  public void ackFeaturePrompt(long userId, FeatureType featureType) {
    FeaturePrompts featurePrompts = getFeaturePrompts(userId);
    Consumer<FeaturePrompts> consumer = FEATURE_PROMPT_ACKERS.get(featureType);
    if (consumer == null) {
      throw new IllegalStateException();
    }
    consumer.accept(featurePrompts);
    entityManager.persist(featurePrompts);
  }

  @Override
  @WithEntityTransaction
  public Tuple2<NudgeStatus, Optional<MailToken>> nudgeMailToken(
      long userId, long tokenId, BiFunction<Instant, Integer, Instant> nextAvailabilityInstant) {
    Optional<MailToken> maybeMailToken = getMailToken(userId, tokenId);
    if (!maybeMailToken.isPresent()) {
      return Tuple.of(NudgeStatus.NOT_FOUND, Optional.empty());
    }
    MailToken mailToken = maybeMailToken.get();
    Instant availabilityInstant =
        nextAvailabilityInstant.apply(mailToken.getLastAttempt(), mailToken.getAttemptCount());
    Instant currentTime = chronometry.currentTime();
    if (!chronometry.isBefore(availabilityInstant, currentTime)) {
      return Tuple.of(NudgeStatus.NOT_AVAILABLE_YET, Optional.empty());
    }
    mailToken.setLastAttempt(currentTime);
    mailToken.incrementAttemptCount();
    entityManager.persist(mailToken);
    return Tuple.of(NudgeStatus.OK, Optional.of(mailToken));
  }
}
