package server.main.services;

import static java.util.stream.Collectors.toList;

import com.google.common.collect.ImmutableList;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.vavr.Tuple2;
import io.vavr.control.Either;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import javax.inject.Inject;
import org.apache.commons.validator.routines.EmailValidator;
import server.main.Cryptography;
import server.main.MailClient;
import server.main.aspects.Annotations.WithEntityManager;
import server.main.entities.FeaturePrompts;
import server.main.entities.Key;
import server.main.entities.MailToken;
import server.main.entities.OtpToken;
import server.main.entities.User;
import server.main.interceptors.AgentAccessor;
import server.main.interceptors.VersionAccessor;
import server.main.keyvalue.KeyValueClient;
import server.main.keyvalue.UserPointer;
import server.main.proto.service.*;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.KeyOperationsInterface;

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

  @Inject
  AuthenticationService(
      AccountOperationsInterface accountOperationsInterface,
      KeyOperationsInterface keyOperationsInterface,
      Cryptography cryptography,
      MailClient mailClient,
      KeyValueClient keyValueClient,
      AgentAccessor agentAccessor,
      VersionAccessor versionAccessor,
      IGoogleAuthenticator googleAuthenticator) {
    this.accountOperationsInterface = accountOperationsInterface;
    this.keyOperationsInterface = keyOperationsInterface;
    this.cryptography = cryptography;
    this.mailClient = mailClient;
    this.keyValueClient = keyValueClient;
    this.agentAccessor = agentAccessor;
    this.versionAccessor = versionAccessor;
    this.googleAuthenticator = googleAuthenticator;
  }

  @WithEntityManager
  private Either<StatusException, RegisterResponse> _register(RegisterRequest request) {
    String username = request.getUsername();
    String mail = request.getMail();
    if (username.trim().isEmpty() || !EmailValidator.getInstance().isValid(mail)) {
      return Either.left(new StatusException(Status.INVALID_ARGUMENT));
    }
    RegisterResponse.Builder builder = RegisterResponse.newBuilder();
    if (accountOperationsInterface.getUserByName(username).isPresent()) {
      return Either.right(builder.setError(RegisterResponse.Error.NAME_TAKEN).build());
    }
    String salt = request.getSalt();
    String hash = cryptography.computeHash(request.getDigest());
    String code = cryptography.generateUacs();
    Tuple2<User, MailToken> entities =
        accountOperationsInterface.createUser(username, salt, hash, mail, code);
    User user = entities._1;
    String sessionKey = keyValueClient.createSession(UserPointer.fromUser(user));
    accountOperationsInterface.createSession(
        user.getIdentifier(),
        sessionKey,
        agentAccessor.getIpAddress(),
        agentAccessor.getUserAgent(),
        versionAccessor.getVersion());
    mailClient.sendMailVc(mail, code);
    return Either.right(
        builder.setSessionKey(sessionKey).setMailTokenId(entities._2.getIdentifier()).build());
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

  private UserData newSessionUserData(User user) {
    long userId = user.getIdentifier();
    String sessionKey = keyValueClient.createSession(UserPointer.fromUser(user));
    accountOperationsInterface.createSession(
        userId,
        sessionKey,
        agentAccessor.getIpAddress(),
        agentAccessor.getUserAgent(),
        versionAccessor.getVersion());
    UserData.Builder userDataBuilder = UserData.newBuilder();
    userDataBuilder.setSessionKey(sessionKey);
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
        keyOperationsInterface.readKeys(userId).stream().map(Key::toKeyProto).collect(toList()));
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
        || Objects.equals(user.getState(), User.State.DELETED)) {
      return builder.setError(LogInResponse.Error.INVALID_CREDENTIALS).build();
    }
    if (user.getOtpSharedSecret() != null) {
      String authnKey = keyValueClient.createAuthn(user.getIdentifier());
      return builder
          .setOtpContext(
              OtpContext.newBuilder()
                  .setAuthnKey(authnKey)
                  .setAttemptsLeft(user.getOtpSpareAttempts()))
          .build();
    }
    return builder.setUserData(newSessionUserData(user)).build();
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
    Optional<Long> maybeUserId = keyValueClient.getUserByAuthn(authnKey);
    if (!maybeUserId.isPresent()) {
      return Either.left(new StatusException(Status.UNAUTHENTICATED));
    }
    long userId = maybeUserId.get();
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
    keyValueClient.dropAuthn(authnKey);
    accountOperationsInterface.restoreOtpSpareAttempts(userId);
    if (request.getYieldTrustedToken()) {
      String otpToken = cryptography.generateTts();
      accountOperationsInterface.createOtpToken(userId, otpToken);
      builder.setTrustedToken(otpToken);
    }
    return Either.right(builder.setUserData(newSessionUserData(user)).build());
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
