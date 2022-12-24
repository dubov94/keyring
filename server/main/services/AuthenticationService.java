package keyring.server.main.services;

import static java.util.stream.Collectors.toList;

import com.google.common.collect.ImmutableList;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.paveldubov.turnstile.TurnstileRequest;
import io.paveldubov.turnstile.TurnstileResponse;
import io.paveldubov.turnstile.TurnstileValidator;
import io.vavr.Tuple2;
import io.vavr.control.Either;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import javax.inject.Inject;
import keyring.server.main.Cryptography;
import keyring.server.main.MailClient;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.entities.FeaturePrompts;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.interceptors.AgentAccessor;
import keyring.server.main.interceptors.VersionAccessor;
import keyring.server.main.keyvalue.KeyValueClient;
import keyring.server.main.keyvalue.values.KvAuthn;
import keyring.server.main.proto.service.*;
import keyring.server.main.storage.AccountOperationsInterface;
import keyring.server.main.storage.KeyOperationsInterface;
import org.apache.commons.validator.routines.EmailValidator;

public class AuthenticationService extends AuthenticationGrpc.AuthenticationImplBase {
  private static FeaturePrompt datalessFeaturePrompt(FeatureType featureType) {
    return FeaturePrompt.newBuilder().setFeatureType(featureType).build();
  }

  private static final ImmutableList<Function<FeaturePrompts, Optional<FeaturePrompt>>>
      FEATURE_PROMPT_MAPPERS =
          ImmutableList.of(
              featurePrompts ->
                  featurePrompts.getOtp()
                      ? Optional.of(datalessFeaturePrompt(FeatureType.OTP))
                      : Optional.empty(),
              featurePrompts ->
                  featurePrompts.getFuzzySearch()
                      ? Optional.of(datalessFeaturePrompt(FeatureType.FUZZY_SEARCH))
                      : Optional.empty());

  private AccountOperationsInterface accountOperationsInterface;
  private KeyOperationsInterface keyOperationsInterface;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private MailClient mailClient;
  private AgentAccessor agentAccessor;
  private VersionAccessor versionAccessor;
  private IGoogleAuthenticator googleAuthenticator;
  private TurnstileValidator turnstileValidator;

  @Inject
  AuthenticationService(
      AccountOperationsInterface accountOperationsInterface,
      KeyOperationsInterface keyOperationsInterface,
      Cryptography cryptography,
      MailClient mailClient,
      KeyValueClient keyValueClient,
      AgentAccessor agentAccessor,
      VersionAccessor versionAccessor,
      IGoogleAuthenticator googleAuthenticator,
      TurnstileValidator turnstileValidator) {
    this.accountOperationsInterface = accountOperationsInterface;
    this.keyOperationsInterface = keyOperationsInterface;
    this.cryptography = cryptography;
    this.mailClient = mailClient;
    this.keyValueClient = keyValueClient;
    this.agentAccessor = agentAccessor;
    this.versionAccessor = versionAccessor;
    this.googleAuthenticator = googleAuthenticator;
    this.turnstileValidator = turnstileValidator;
  }

  private Optional<StatusException> validateRegisterRequest(RegisterRequest request) {
    TurnstileRequest turnstileRequest =
        TurnstileRequest.newBuilder().setResponse(request.getCaptchaToken()).build();
    TurnstileResponse turnstileResponse = turnstileValidator.validate(turnstileRequest);
    if (!turnstileResponse.success()) {
      return Optional.of(new StatusException(Status.UNAUTHENTICATED));
    }
    if (!Validators.checkUsername(request.getUsername())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    if (!cryptography.validateA2p(request.getSalt())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    if (!cryptography.validateDigest(request.getDigest())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    if (!EmailValidator.getInstance().isValid(request.getMail())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    return Optional.empty();
  }

  @WithEntityManager
  private Either<StatusException, RegisterResponse> _register(RegisterRequest request) {
    Optional<StatusException> validation = validateRegisterRequest(request);
    if (validation.isPresent()) {
      return Either.left(validation.get());
    }
    RegisterResponse.Builder builder = RegisterResponse.newBuilder();
    String username = request.getUsername();
    if (accountOperationsInterface.getUserByName(username).isPresent()) {
      return Either.right(builder.setError(RegisterResponse.Error.NAME_TAKEN).build());
    }
    String salt = request.getSalt();
    String hash = cryptography.computeHash(request.getDigest());
    String mail = request.getMail();
    String code = cryptography.generateUacs();
    Tuple2<User, MailToken> entities =
        accountOperationsInterface.createUser(username, salt, hash, mail, code);
    User user = entities._1;
    long userId = user.getIdentifier();
    String sessionToken = cryptography.generateTts();
    Session session =
        accountOperationsInterface.createSession(
            userId,
            user.getVersion(),
            agentAccessor.getIpAddress(),
            agentAccessor.getUserAgent(),
            versionAccessor.getVersion());
    long sessionId = session.getIdentifier();
    accountOperationsInterface.activateSession(
        userId, sessionId, keyValueClient.convertSessionTokenToKey(sessionToken));
    keyValueClient.createSession(sessionToken, userId, sessionId);
    mailClient.sendMailVc(mail, code);
    return Either.right(
        builder.setSessionKey(sessionToken).setMailTokenId(entities._2.getIdentifier()).build());
  }

  @Override
  public void register(RegisterRequest request, StreamObserver<RegisterResponse> response) {
    Either<StatusException, RegisterResponse> result = _register(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  @WithEntityManager
  private GetSaltResponse _getSalt(GetSaltRequest request) {
    GetSaltResponse.Builder builder = GetSaltResponse.newBuilder();
    Optional<User> maybeUser = accountOperationsInterface.getUserByName(request.getUsername());
    if (!maybeUser.isPresent()) {
      return builder.setError(GetSaltResponse.Error.NOT_FOUND).build();
    }
    return builder.setSalt(maybeUser.get().getSalt()).build();
  }

  @Override
  public void getSalt(GetSaltRequest request, StreamObserver<GetSaltResponse> response) {
    response.onNext(_getSalt(request));
    response.onCompleted();
  }

  private UserData newUserData(long sessionEntityId, String sessionToken, User user) {
    long userId = user.getIdentifier();
    UserData.Builder userDataBuilder = UserData.newBuilder();
    userDataBuilder.setSessionKey(sessionToken);
    FeaturePrompts featurePrompts = accountOperationsInterface.getFeaturePrompts(userId);
    userDataBuilder.addAllFeaturePrompts(
        FEATURE_PROMPT_MAPPERS.stream()
            .map(mapper -> mapper.apply(featurePrompts))
            .flatMap(Optional::stream)
            .collect(toList()));
    if (user.getMail() == null) {
      MailVerification.Builder mailVerificationBuilder = MailVerification.newBuilder();
      mailVerificationBuilder.setRequired(true);
      Optional<MailToken> mailToken = accountOperationsInterface.latestMailToken(userId);
      if (mailToken.isPresent()) {
        mailVerificationBuilder.setTokenId(mailToken.get().getIdentifier());
      }
      userDataBuilder.setMailVerification(mailVerificationBuilder);
    } else {
      userDataBuilder.setMail(user.getMail());
    }
    userDataBuilder.addAllUserKeys(
        keyOperationsInterface.readKeys(sessionEntityId).stream()
            .map(Key::toKeyProto)
            .collect(toList()));
    return userDataBuilder.build();
  }

  @WithEntityManager
  private LogInResponse _logIn(LogInRequest request) {
    LogInResponse.Builder builder = LogInResponse.newBuilder();
    Optional<User> maybeUser = accountOperationsInterface.getUserByName(request.getUsername());
    if (!maybeUser.isPresent()) {
      return builder.setError(LogInResponse.Error.INVALID_CREDENTIALS).build();
    }
    User user = maybeUser.get();
    if (!cryptography.doesDigestMatchHash(request.getDigest(), user.getHash())
        || Objects.equals(user.getState(), UserState.DELETED)) {
      return builder.setError(LogInResponse.Error.INVALID_CREDENTIALS).build();
    }
    long userId = user.getIdentifier();
    Session session =
        accountOperationsInterface.createSession(
            userId,
            user.getVersion(),
            agentAccessor.getIpAddress(),
            agentAccessor.getUserAgent(),
            versionAccessor.getVersion());
    long sessionEntityId = session.getIdentifier();
    if (user.getOtpSharedSecret() != null) {
      String authnToken = cryptography.generateTts();
      accountOperationsInterface.initiateSession(
          userId, sessionEntityId, keyValueClient.convertAuthnTokenToKey(authnToken));
      keyValueClient.createAuthn(authnToken, userId, sessionEntityId);
      return builder
          .setOtpContext(
              OtpContext.newBuilder()
                  .setAuthnKey(authnToken)
                  .setAttemptsLeft(user.getOtpSpareAttempts()))
          .build();
    }
    String sessionToken = cryptography.generateTts();
    accountOperationsInterface.activateSession(
        userId, sessionEntityId, keyValueClient.convertSessionTokenToKey(sessionToken));
    keyValueClient.createSession(sessionToken, userId, sessionEntityId);
    return builder.setUserData(newUserData(sessionEntityId, sessionToken, user)).build();
  }

  @Override
  public void logIn(LogInRequest request, StreamObserver<LogInResponse> response) {
    response.onNext(_logIn(request));
    response.onCompleted();
  }

  @WithEntityManager
  private Either<StatusException, ProvideOtpResponse> _provideOtp(ProvideOtpRequest request) {
    ProvideOtpResponse.Builder builder = ProvideOtpResponse.newBuilder();
    String authnKey = request.getAuthnKey();
    Optional<KvAuthn> maybeKvAuthn = keyValueClient.getKvAuthn(authnKey);
    if (!maybeKvAuthn.isPresent()) {
      return Either.left(new StatusException(Status.UNAUTHENTICATED));
    }
    KvAuthn kvAuthn = maybeKvAuthn.get();
    long userId = kvAuthn.getUserId();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    Optional<Integer> maybeTotp = cryptography.convertTotp(request.getOtp());
    if (maybeTotp.isPresent()) {
      Optional<Integer> attemptsLeft = accountOperationsInterface.acquireOtpSpareAttempt(userId);
      if (!attemptsLeft.isPresent()) {
        return Either.right(builder.setError(ProvideOtpResponse.Error.ATTEMPTS_EXHAUSTED).build());
      }
      if (!googleAuthenticator.authorize(user.getOtpSharedSecret(), maybeTotp.get())) {
        return Either.right(
            builder
                .setError(ProvideOtpResponse.Error.INVALID_CODE)
                .setAttemptsLeft(attemptsLeft.get())
                .build());
      }
    } else {
      Optional<OtpToken> maybeOtpToken =
          accountOperationsInterface.getOtpToken(
              userId, request.getOtp(), /* mustBeInitial = */ false);
      if (!maybeOtpToken.isPresent()) {
        return Either.right(
            builder
                .setError(ProvideOtpResponse.Error.INVALID_CODE)
                .setAttemptsLeft(user.getOtpSpareAttempts())
                .build());
      }
      accountOperationsInterface.deleteOtpToken(userId, maybeOtpToken.get().getId());
    }
    keyValueClient.deleteAuthn(authnKey);
    accountOperationsInterface.restoreOtpSpareAttempts(userId);
    if (request.getYieldTrustedToken()) {
      String otpToken = cryptography.generateTts();
      accountOperationsInterface.createOtpToken(userId, otpToken);
      builder.setTrustedToken(otpToken);
    }
    long sessionEntityId = kvAuthn.getSessionEntityId();
    String sessionToken = cryptography.generateTts();
    accountOperationsInterface.activateSession(
        userId, sessionEntityId, keyValueClient.convertSessionTokenToKey(sessionToken));
    keyValueClient.createSession(sessionToken, userId, sessionEntityId);
    return Either.right(
        builder.setUserData(newUserData(sessionEntityId, sessionToken, user)).build());
  }

  @Override
  public void provideOtp(ProvideOtpRequest request, StreamObserver<ProvideOtpResponse> response) {
    Either<StatusException, ProvideOtpResponse> result = _provideOtp(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }
}
