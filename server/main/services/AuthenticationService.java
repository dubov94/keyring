package server.main.services;

import static java.util.stream.Collectors.toList;

import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.vavr.control.Either;
import java.util.Objects;
import java.util.Optional;
import javax.inject.Inject;
import server.main.Cryptography;
import server.main.Environment;
import server.main.MailClient;
import server.main.entities.Key;
import server.main.entities.OtpToken;
import server.main.entities.User;
import server.main.interceptors.AgentAccessor;
import server.main.keyvalue.KeyValueClient;
import server.main.keyvalue.UserPointer;
import server.main.proto.service.*;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.KeyOperationsInterface;

public class AuthenticationService extends AuthenticationGrpc.AuthenticationImplBase {
  private AccountOperationsInterface accountOperationsInterface;
  private KeyOperationsInterface keyOperationsInterface;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private MailClient mailClient;
  private AgentAccessor agentAccessor;
  private Environment environment;
  private IGoogleAuthenticator googleAuthenticator;

  @Inject
  AuthenticationService(
      AccountOperationsInterface accountOperationsInterface,
      KeyOperationsInterface keyOperationsInterface,
      Cryptography cryptography,
      MailClient mailClient,
      KeyValueClient keyValueClient,
      AgentAccessor agentAccessor,
      Environment environment,
      IGoogleAuthenticator googleAuthenticator) {
    this.accountOperationsInterface = accountOperationsInterface;
    this.keyOperationsInterface = keyOperationsInterface;
    this.cryptography = cryptography;
    this.mailClient = mailClient;
    this.keyValueClient = keyValueClient;
    this.agentAccessor = agentAccessor;
    this.environment = environment;
    this.googleAuthenticator = googleAuthenticator;
  }

  private RegisterResponse _register(RegisterRequest request) {
    RegisterResponse.Builder builder = RegisterResponse.newBuilder();
    String username = request.getUsername();
    if (accountOperationsInterface.getUserByName(username).isPresent()) {
      return builder.setError(RegisterResponse.Error.NAME_TAKEN).build();
    }
    String salt = request.getSalt();
    String hash = cryptography.computeHash(request.getDigest());
    String mail = request.getMail();
    String code = cryptography.generateUacs();
    User user = accountOperationsInterface.createUser(username, salt, hash, mail, code);
    String sessionKey = keyValueClient.createSession(UserPointer.fromUser(user));
    accountOperationsInterface.createSession(
        user.getIdentifier(),
        sessionKey,
        agentAccessor.getIpAddress(),
        agentAccessor.getUserAgent());
    mailClient.sendMailVerificationCode(mail, code);
    return builder.setSessionKey(sessionKey).build();
  }

  @Override
  public void register(RegisterRequest request, StreamObserver<RegisterResponse> response) {
    response.onNext(_register(request));
    response.onCompleted();
  }

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

  private UserData newUserData(User user) {
    String sessionKey = keyValueClient.createSession(UserPointer.fromUser(user));
    accountOperationsInterface.createSession(
        user.getIdentifier(),
        sessionKey,
        agentAccessor.getIpAddress(),
        agentAccessor.getUserAgent());
    UserData.Builder userDataBuilder = UserData.newBuilder();
    userDataBuilder.setSessionKey(sessionKey);
    if (user.getMail() == null) {
      userDataBuilder.setMailVerificationRequired(true);
    } else {
      userDataBuilder.setMail(user.getMail());
    }
    userDataBuilder.addAllUserKeys(
        keyOperationsInterface.readKeys(user.getIdentifier()).stream()
            .map(Key::toIdentifiedKey)
            .collect(toList()));
    return userDataBuilder.build();
  }

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
    if (!environment.isProduction() && user.getOtpSharedSecret() != null) {
      String authnKey = keyValueClient.createAuthn(user.getIdentifier());
      return builder
          .setOtpContext(
              OtpContext.newBuilder()
                  .setAuthnKey(authnKey)
                  .setAttemptsLeft(user.getOtpSpareAttempts()))
          .build();
    }
    return builder.setUserData(newUserData(user)).build();
  }

  @Override
  public void logIn(LogInRequest request, StreamObserver<LogInResponse> response) {
    response.onNext(_logIn(request));
    response.onCompleted();
  }

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
      accountOperationsInterface.deleteOtpToken(maybeOtpToken.get().getId());
    }
    keyValueClient.dropAuthn(authnKey);
    accountOperationsInterface.restoreOtpSpareAttempts(userId);
    if (request.getYieldTrustedToken()) {
      String otpToken = cryptography.generateTts();
      accountOperationsInterface.createOtpToken(userId, otpToken);
      builder.setTrustedToken(otpToken);
    }
    return Either.right(builder.setUserData(newUserData(user)).build());
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
