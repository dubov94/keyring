package server.main.services;

import static java.util.stream.Collectors.toList;

import io.grpc.stub.StreamObserver;
import java.util.Objects;
import java.util.Optional;
import javax.inject.Inject;
import server.main.Cryptography;
import server.main.MailClient;
import server.main.entities.Key;
import server.main.entities.User;
import server.main.interceptors.RequestMetadataInterceptorKeys;
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
  private RequestMetadataInterceptorKeys requestMetadataInterceptorKeys;

  @Inject
  AuthenticationService(
      AccountOperationsInterface accountOperationsInterface,
      KeyOperationsInterface keyOperationsInterface,
      Cryptography cryptography,
      MailClient mailClient,
      KeyValueClient keyValueClient,
      RequestMetadataInterceptorKeys requestMetadataInterceptorKeys) {
    this.accountOperationsInterface = accountOperationsInterface;
    this.keyOperationsInterface = keyOperationsInterface;
    this.cryptography = cryptography;
    this.mailClient = mailClient;
    this.keyValueClient = keyValueClient;
    this.requestMetadataInterceptorKeys = requestMetadataInterceptorKeys;
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
        requestMetadataInterceptorKeys.getIpAddress(),
        requestMetadataInterceptorKeys.getUserAgent());
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
    String sessionKey = keyValueClient.createSession(UserPointer.fromUser(user));
    accountOperationsInterface.createSession(
        user.getIdentifier(),
        sessionKey,
        requestMetadataInterceptorKeys.getIpAddress(),
        requestMetadataInterceptorKeys.getUserAgent());
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
    return builder.setUserData(userDataBuilder).build();
  }

  @Override
  public void logIn(LogInRequest request, StreamObserver<LogInResponse> response) {
    response.onNext(_logIn(request));
    response.onCompleted();
  }

  @Override
  public void provideOtp(ProvideOtpRequest request, StreamObserver<ProvideOtpResponse> response) {
    throw new UnsupportedOperationException();
  }
}
