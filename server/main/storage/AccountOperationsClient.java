package server.main.storage;

import static java.util.stream.Collectors.toMap;

import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Consumer;
import javax.persistence.EntityManager;
import javax.persistence.LockModeType;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import server.main.Chronometry;
import server.main.aspects.Annotations.EntityController;
import server.main.aspects.Annotations.LocalTransaction;
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
  @EntityController private EntityManager entityManager;

  AccountOperationsClient(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  @Override
  @LocalTransaction
  public User createUser(String username, String salt, String hash, String mail, String code) {
    User user =
        new User().setState(User.State.PENDING).setUsername(username).setSalt(salt).setHash(hash);
    FeaturePrompts featurePrompts = new FeaturePrompts().setUser(user);
    MailToken mailToken = new MailToken().setUser(user).setMail(mail).setCode(code);
    entityManager.persist(user);
    entityManager.persist(featurePrompts);
    entityManager.persist(mailToken);
    return user;
  }

  @Override
  @LocalTransaction
  public void createMailToken(long userIdentifier, String mail, String code) {
    MailToken mailToken =
        new MailToken()
            .setUser(entityManager.getReference(User.class, userIdentifier))
            .setMail(mail)
            .setCode(code);
    entityManager.persist(mailToken);
  }

  @Override
  @LocalTransaction
  public Optional<MailToken> getMailToken(long userIdentifier, String token) {
    return Queries.findByUser(entityManager, MailToken.class, MailToken_.user, userIdentifier)
        .stream()
        .filter(mailToken -> Objects.equals(mailToken.getCode(), token))
        .findFirst();
  }

  @Override
  @LocalTransaction
  public void releaseMailToken(long tokenIdentifier) {
    Optional<MailToken> maybeMailToken =
        Optional.ofNullable(entityManager.find(MailToken.class, tokenIdentifier));
    if (!maybeMailToken.isPresent()) {
      throw new IllegalArgumentException();
    }
    MailToken mailToken = maybeMailToken.get();
    Optional<User> maybeUser = Optional.ofNullable(mailToken.getUser());
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    user.setMail(mailToken.getMail());
    if (user.isActivated()) {
      user.setState(User.State.ACTIVE);
    }
    entityManager.persist(user);
    entityManager.remove(mailToken);
  }

  @Override
  @LocalTransaction
  public Optional<User> getUserByName(String username) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaQuery<User> criteriaQuery = criteriaBuilder.createQuery(User.class);
    Root<User> root = criteriaQuery.from(User.class);
    criteriaQuery.select(root).where(criteriaBuilder.equal(root.get(User_.username), username));
    return entityManager.createQuery(criteriaQuery).getResultList().stream().findFirst();
  }

  @LocalTransaction
  private Optional<User> getUserByIdentifier(long identifier, LockModeType lockModeType) {
    return Optional.ofNullable(entityManager.find(User.class, identifier, lockModeType));
  }

  @Override
  public Optional<User> getUserByIdentifier(long identifier) {
    // https://stackoverflow.com/a/13569657
    return getUserByIdentifier(identifier, LockModeType.NONE);
  }

  @Override
  @LocalTransaction
  public void changeMasterKey(
      long userIdentifier, String salt, String hash, List<KeyPatch> protos) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    user.setSalt(salt);
    user.setHash(hash);
    entityManager.persist(user);
    List<Key> entities = Queries.findByUser(entityManager, Key.class, Key_.user, userIdentifier);
    Map<Long, Password> keyIdentifierToProto =
        protos.stream().collect(toMap(KeyPatch::getIdentifier, KeyPatch::getPassword));
    for (Key entity : entities) {
      Optional<Password> maybeProto =
          Optional.ofNullable(keyIdentifierToProto.get(entity.getIdentifier()));
      if (!maybeProto.isPresent()) {
        throw new IllegalArgumentException();
      }
      Password proto = maybeProto.get();
      entity.mergeFromPassword(proto);
      entityManager.persist(entity);
    }
  }

  @Override
  @LocalTransaction
  public void changeUsername(long userIdentifier, String username) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    user.setUsername(username);
    entityManager.persist(user);
  }

  @Override
  @LocalTransaction
  public void createSession(
      long userIdentifier, String key, String ipAddress, String userAgent, String clientVersion) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
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
  @LocalTransaction
  public List<Session> readSessions(long userIdentifier) {
    return Queries.findByUser(entityManager, Session.class, Session_.user, userIdentifier);
  }

  @Override
  @LocalTransaction
  public void markAccountAsDeleted(long userIdentifier) {
    Optional<User> maybeUser = getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    user.setState(User.State.DELETED);
    entityManager.persist(user);
  }

  @Override
  @LocalTransaction
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
  @LocalTransaction
  public Optional<OtpParams> getOtpParams(long userId, long otpParamsId) {
    return Queries.findByUser(entityManager, OtpParams.class, OtpParams_.user, userId).stream()
        .filter(otpParams -> Objects.equals(otpParams.getId(), otpParamsId))
        .findFirst();
  }

  @Override
  @LocalTransaction
  public void acceptOtpParams(long otpParamsId) {
    Optional<OtpParams> maybeOtpParams =
        Optional.ofNullable(entityManager.find(OtpParams.class, otpParamsId));
    if (!maybeOtpParams.isPresent()) {
      throw new IllegalArgumentException();
    }
    OtpParams otpParams = maybeOtpParams.get();
    User user = otpParams.getUser();
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
  @LocalTransaction
  public void createOtpToken(long userId, String otpToken) {
    // To prevent `resetOtp` from getting stale tokens.
    Optional<User> maybeUser = getUserByIdentifier(userId, LockModeType.OPTIMISTIC_FORCE_INCREMENT);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    if (user.getOtpSharedSecret() == null) {
      throw new IllegalArgumentException();
    }
    entityManager.persist(new OtpToken().setUser(user).setIsInitial(false).setValue(otpToken));
  }

  @Override
  @LocalTransaction
  public Optional<OtpToken> getOtpToken(long userId, String value, boolean mustBeInitial) {
    return Queries.findByUser(entityManager, OtpToken.class, OtpToken_.user, userId).stream()
        .filter(
            otpParams ->
                Objects.equals(otpParams.getValue(), value)
                    && (!mustBeInitial || otpParams.getIsInitial()))
        .findFirst();
  }

  @Override
  @LocalTransaction
  public void deleteOtpToken(long tokenId) {
    Optional<OtpToken> maybeOtpToken =
        Optional.ofNullable(entityManager.find(OtpToken.class, tokenId));
    if (!maybeOtpToken.isPresent()) {
      throw new IllegalArgumentException();
    }
    entityManager.remove(maybeOtpToken.get());
  }

  @Override
  @LocalTransaction
  public void resetOtp(long userId) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    user.setOtpSharedSecret(null);
    user.setOtpSpareAttempts(0);
    entityManager.persist(user);
    List<OtpToken> otpTokens =
        Queries.findByUser(entityManager, OtpToken.class, OtpToken_.user, userId);
    for (OtpToken otpToken : otpTokens) {
      entityManager.remove(otpToken);
    }
  }

  @Override
  @LocalTransaction
  public Optional<Integer> acquireOtpSpareAttempt(long userId) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    int attemptsLeft = user.getOtpSpareAttempts();
    if (attemptsLeft == 0) {
      return Optional.empty();
    }
    user.decrementOtpSpareAttempts();
    entityManager.persist(user);
    return Optional.of(attemptsLeft - 1);
  }

  @Override
  @LocalTransaction
  public void restoreOtpSpareAttempts(long userId) {
    Optional<User> maybeUser = getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      throw new IllegalArgumentException();
    }
    User user = maybeUser.get();
    if (user.getOtpSharedSecret() == null) {
      throw new IllegalArgumentException();
    }
    user.setOtpSpareAttempts(INITIAL_SPARE_ATTEMPTS);
    entityManager.persist(user);
  }

  @Override
  @LocalTransaction
  public FeaturePrompts getFeaturePrompts(long userId) {
    Optional<FeaturePrompts> maybeFeaturePrompts =
        Optional.ofNullable(entityManager.find(FeaturePrompts.class, userId));
    if (!maybeFeaturePrompts.isPresent()) {
      throw new IllegalArgumentException();
    }
    return maybeFeaturePrompts.get();
  }

  @Override
  @LocalTransaction
  public void ackFeaturePrompt(long userId, FeatureType featureType) {
    FeaturePrompts featurePrompts = getFeaturePrompts(userId);
    Consumer<FeaturePrompts> consumer = FEATURE_PROMPT_ACKERS.get(featureType);
    if (consumer == null) {
      throw new IllegalStateException();
    }
    consumer.accept(featurePrompts);
    entityManager.persist(featurePrompts);
  }
}
