package server.main.services;

import static java.util.function.Function.identity;
import static java.util.stream.Collectors.*;

import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.vavr.Tuple2;
import io.vavr.control.Either;
import java.util.*;
import java.util.stream.Stream;
import javax.inject.Inject;
import org.apache.commons.validator.routines.EmailValidator;
import server.main.Cryptography;
import server.main.MailClient;
import server.main.aspects.Annotations.ValidateUser;
import server.main.entities.Key;
import server.main.entities.MailToken;
import server.main.entities.OtpParams;
import server.main.entities.OtpToken;
import server.main.entities.Session;
import server.main.entities.User;
import server.main.geolocation.GeolocationServiceInterface;
import server.main.interceptors.SessionAccessor;
import server.main.keyvalue.KeyValueClient;
import server.main.keyvalue.UserPointer;
import server.main.proto.service.*;
import server.main.storage.AccountOperationsInterface;
import server.main.storage.KeyOperationsInterface;

public class AdministrationService extends AdministrationGrpc.AdministrationImplBase {
  private KeyOperationsInterface keyOperationsInterface;
  private AccountOperationsInterface accountOperationsInterface;
  private GeolocationServiceInterface geolocationServiceInterface;
  private SessionAccessor sessionAccessor;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private MailClient mailClient;
  private IGoogleAuthenticator googleAuthenticator;

  @Inject
  AdministrationService(
      KeyOperationsInterface keyOperationsInterface,
      AccountOperationsInterface accountOperationsInterface,
      GeolocationServiceInterface geolocationServiceInterface,
      SessionAccessor sessionAccessor,
      KeyValueClient keyValueClient,
      Cryptography cryptography,
      MailClient mailClient,
      IGoogleAuthenticator googleAuthenticator) {
    this.keyOperationsInterface = keyOperationsInterface;
    this.accountOperationsInterface = accountOperationsInterface;
    this.geolocationServiceInterface = geolocationServiceInterface;
    this.sessionAccessor = sessionAccessor;
    this.keyValueClient = keyValueClient;
    this.cryptography = cryptography;
    this.mailClient = mailClient;
    this.googleAuthenticator = googleAuthenticator;
  }

  private Either<StatusException, AcquireMailTokenResponse> _acquireMailToken(
      AcquireMailTokenRequest request) {
    String mail = request.getMail();
    if (!EmailValidator.getInstance().isValid(mail)) {
      return Either.left(new StatusException(Status.INVALID_ARGUMENT));
    }
    long userIdentifier = sessionAccessor.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    AcquireMailTokenResponse.Builder builder = AcquireMailTokenResponse.newBuilder();
    if (!cryptography.doesDigestMatchHash(request.getDigest(), user.getHash())) {
      return Either.right(builder.setError(AcquireMailTokenResponse.Error.INVALID_DIGEST).build());
    }
    String code = cryptography.generateUacs();
    accountOperationsInterface.createMailToken(userIdentifier, mail, code);
    mailClient.sendMailVerificationCode(mail, code);
    return Either.right(builder.build());
  }

  @Override
  @ValidateUser
  public void acquireMailToken(
      AcquireMailTokenRequest request, StreamObserver<AcquireMailTokenResponse> response) {
    Either<StatusException, AcquireMailTokenResponse> result = _acquireMailToken(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  private ReleaseMailTokenResponse _releaseMailToken(ReleaseMailTokenRequest request) {
    ReleaseMailTokenResponse.Builder builder = ReleaseMailTokenResponse.newBuilder();
    Optional<MailToken> maybeMailToken =
        accountOperationsInterface.getMailToken(
            sessionAccessor.getUserIdentifier(), request.getCode());
    if (!maybeMailToken.isPresent()) {
      return builder.setError(ReleaseMailTokenResponse.Error.INVALID_CODE).build();
    }
    MailToken mailToken = maybeMailToken.get();
    accountOperationsInterface.releaseMailToken(mailToken.getIdentifier());
    return builder.setMail(mailToken.getMail()).build();
  }

  @Override
  @ValidateUser(states = {User.State.PENDING, User.State.ACTIVE})
  public void releaseMailToken(
      ReleaseMailTokenRequest request, StreamObserver<ReleaseMailTokenResponse> response) {
    response.onNext(_releaseMailToken(request));
    response.onCompleted();
  }

  @Override
  public void keepAlive(KeepAliveRequest request, StreamObserver<KeepAliveResponse> response) {
    response.onNext(KeepAliveResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void createKey(CreateKeyRequest request, StreamObserver<CreateKeyResponse> response) {
    long identifier =
        keyOperationsInterface
            .createKey(
                sessionAccessor.getUserIdentifier(), request.getPassword(), request.getAttrs())
            .getIdentifier();
    response.onNext(CreateKeyResponse.newBuilder().setIdentifier(identifier).build());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void readKeys(ReadKeysRequest request, StreamObserver<ReadKeysResponse> response) {
    List<KeyProto> keys =
        keyOperationsInterface.readKeys(sessionAccessor.getUserIdentifier()).stream()
            .map(Key::toKeyProto)
            .collect(toList());
    response.onNext(ReadKeysResponse.newBuilder().addAllKeys(keys).build());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void updateKey(UpdateKeyRequest request, StreamObserver<UpdateKeyResponse> response) {
    keyOperationsInterface.updateKey(sessionAccessor.getUserIdentifier(), request.getKey());
    response.onNext(UpdateKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void deleteKey(DeleteKeyRequest request, StreamObserver<DeleteKeyResponse> response) {
    keyOperationsInterface.deleteKey(sessionAccessor.getUserIdentifier(), request.getIdentifier());
    response.onNext(DeleteKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void promoteShadow(
      PromoteShadowRequest request, StreamObserver<PromoteShadowResponse> response) {
    Tuple2<Key, List<Key>> promotion =
        keyOperationsInterface.promoteShadow(
            sessionAccessor.getUserIdentifier(), request.getIdentifier());
    response.onNext(
        PromoteShadowResponse.newBuilder()
            .setParent(promotion._1.getIdentifier())
            .addAllDeletedShadows(promotion._2.stream().map(Key::getIdentifier).collect(toList()))
            .build());
    response.onCompleted();
  }

  private Either<StatusException, ChangeMasterKeyResponse> _changeMasterKey(
      ChangeMasterKeyRequest request) {
    long identifier = sessionAccessor.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(identifier);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    ChangeMasterKeyResponse.Builder builder = ChangeMasterKeyResponse.newBuilder();
    if (!cryptography.doesDigestMatchHash(request.getCurrentDigest(), user.getHash())) {
      return Either.right(
          builder.setError(ChangeMasterKeyResponse.Error.INVALID_CURRENT_DIGEST).build());
    }
    ChangeMasterKeyRequest.Renewal renewal = request.getRenewal();
    accountOperationsInterface.changeMasterKey(
        identifier,
        renewal.getSalt(),
        cryptography.computeHash(renewal.getDigest()),
        renewal.getKeysList());
    List<Session> sessions = accountOperationsInterface.readSessions(identifier);
    keyValueClient.dropSessions(sessions.stream().map(Session::getKey).collect(toList()));
    String sessionKey = keyValueClient.createSession(UserPointer.fromUser(user));
    return Either.right(builder.setSessionKey(sessionKey).build());
  }

  @Override
  @ValidateUser
  public void changeMasterKey(
      ChangeMasterKeyRequest request, StreamObserver<ChangeMasterKeyResponse> response) {
    Either<StatusException, ChangeMasterKeyResponse> result = _changeMasterKey(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  private Either<StatusException, ChangeUsernameResponse> _changeUsername(
      ChangeUsernameRequest request) {
    String username = request.getUsername();
    if (username.trim().isEmpty()) {
      return Either.left(new StatusException(Status.INVALID_ARGUMENT));
    }
    long userIdentifier = sessionAccessor.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    ChangeUsernameResponse.Builder builder = ChangeUsernameResponse.newBuilder();
    if (!cryptography.doesDigestMatchHash(request.getDigest(), user.getHash())) {
      return Either.right(builder.setError(ChangeUsernameResponse.Error.INVALID_DIGEST).build());
    }
    if (accountOperationsInterface.getUserByName(request.getUsername()).isPresent()) {
      return Either.right(builder.setError(ChangeUsernameResponse.Error.NAME_TAKEN).build());
    }
    accountOperationsInterface.changeUsername(userIdentifier, request.getUsername());
    return Either.right(builder.build());
  }

  @Override
  @ValidateUser
  public void changeUsername(
      ChangeUsernameRequest request, StreamObserver<ChangeUsernameResponse> response) {
    Either<StatusException, ChangeUsernameResponse> result = _changeUsername(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  private Either<StatusException, DeleteAccountResponse> _deleteAccount(
      DeleteAccountRequest request) {
    long userIdentifier = sessionAccessor.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    DeleteAccountResponse.Builder builder = DeleteAccountResponse.newBuilder();
    if (!cryptography.doesDigestMatchHash(request.getDigest(), user.getHash())) {
      return Either.right(builder.setError(DeleteAccountResponse.Error.INVALID_DIGEST).build());
    }
    keyValueClient.dropSessions(
        accountOperationsInterface.readSessions(userIdentifier).stream()
            .map(Session::getKey)
            .collect(toList()));
    accountOperationsInterface.markAccountAsDeleted(userIdentifier);
    return Either.right(builder.build());
  }

  @Override
  @ValidateUser
  public void deleteAccount(
      DeleteAccountRequest request, StreamObserver<DeleteAccountResponse> response) {
    Either<StatusException, DeleteAccountResponse> result = _deleteAccount(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  @Override
  @ValidateUser
  public void getRecentSessions(
      GetRecentSessionsRequest request, StreamObserver<GetRecentSessionsResponse> response) {
    long userIdentifier = sessionAccessor.getUserIdentifier();
    List<Session> sessions =
        accountOperationsInterface.readSessions(userIdentifier).stream()
            .sorted(Comparator.comparing(Session::getTimestamp).reversed())
            .collect(toList());
    Set<String> ipAddressSet = sessions.stream().map(Session::getIpAddress).collect(toSet());
    Map<String, Geolocation> ipToGeolocation =
        ipAddressSet.stream().collect(toMap(identity(), geolocationServiceInterface::getIpInfo));
    response.onNext(
        GetRecentSessionsResponse.newBuilder()
            .addAllSessions(
                sessions.stream()
                    .map(
                        session ->
                            GetRecentSessionsResponse.Session.newBuilder()
                                .setCreationTimeInMillis(session.getTimestamp().getTime())
                                .setIpAddress(session.getIpAddress())
                                .setUserAgent(session.getUserAgent())
                                .setGeolocation(ipToGeolocation.get(session.getIpAddress()))
                                .build())
                    .collect(toList()))
            .build());
    response.onCompleted();
  }

  private Either<StatusException, GenerateOtpParamsResponse> _generateOtpParams(
      GenerateOtpParamsRequest request) {
    Optional<User> maybeUser =
        accountOperationsInterface.getUserByIdentifier(sessionAccessor.getUserIdentifier());
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    GoogleAuthenticatorKey credentials = googleAuthenticator.createCredentials();
    String sharedSecret = credentials.getKey();
    List<String> scratchCodes =
        Stream.generate(cryptography::generateTts).limit(5).collect(toList());
    OtpParams otpParams =
        accountOperationsInterface.createOtpParams(
            user.getIdentifier(), sharedSecret, scratchCodes);
    return Either.right(
        GenerateOtpParamsResponse.newBuilder()
            .setOtpParamsId(String.valueOf(otpParams.getId()))
            .setSharedSecret(sharedSecret)
            .setKeyUri(
                GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(
                    "keyring", user.getUsername(), credentials))
            .addAllScratchCodes(scratchCodes)
            .build());
  }

  @Override
  @ValidateUser
  public void generateOtpParams(
      GenerateOtpParamsRequest request, StreamObserver<GenerateOtpParamsResponse> response) {
    Either<StatusException, GenerateOtpParamsResponse> result = _generateOtpParams(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  private Either<StatusException, AcceptOtpParamsResponse> _acceptOtpParams(
      AcceptOtpParamsRequest request) {
    long userIdentifier = sessionAccessor.getUserIdentifier();
    Optional<OtpParams> maybeOtpParams =
        accountOperationsInterface.getOtpParams(
            userIdentifier, Long.valueOf(request.getOtpParamsId()));
    if (!maybeOtpParams.isPresent()) {
      return Either.left(new StatusException(Status.NOT_FOUND));
    }
    AcceptOtpParamsResponse.Builder builder = AcceptOtpParamsResponse.newBuilder();
    OtpParams otpParams = maybeOtpParams.get();
    Optional<Integer> maybeTotp = cryptography.convertTotp(request.getOtp());
    if (!maybeTotp.isPresent()
        || !googleAuthenticator.authorize(otpParams.getOtpSharedSecret(), maybeTotp.get())) {
      return Either.right(builder.setError(AcceptOtpParamsResponse.Error.INVALID_CODE).build());
    }
    accountOperationsInterface.acceptOtpParams(otpParams.getId());
    if (request.getYieldTrustedToken()) {
      String otpToken = cryptography.generateTts();
      accountOperationsInterface.createOtpToken(userIdentifier, otpToken);
      builder.setTrustedToken(otpToken);
    }
    return Either.right(builder.build());
  }

  @Override
  @ValidateUser
  public void acceptOtpParams(
      AcceptOtpParamsRequest request, StreamObserver<AcceptOtpParamsResponse> response) {
    Either<StatusException, AcceptOtpParamsResponse> result = _acceptOtpParams(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  private Either<StatusException, ResetOtpResponse> _resetOtp(ResetOtpRequest request) {
    long userId = sessionAccessor.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userId);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    String sharedSecret = user.getOtpSharedSecret();
    if (sharedSecret == null) {
      return Either.left(new StatusException(Status.INVALID_ARGUMENT));
    }
    ResetOtpResponse.Builder builder = ResetOtpResponse.newBuilder();
    Optional<Integer> maybeTotp = cryptography.convertTotp(request.getOtp());
    if (maybeTotp.isPresent()) {
      if (!googleAuthenticator.authorize(sharedSecret, maybeTotp.get())) {
        return Either.right(builder.setError(ResetOtpResponse.Error.INVALID_CODE).build());
      }
    } else {
      Optional<OtpToken> maybeOtpToken =
          accountOperationsInterface.getOtpToken(
              userId, request.getOtp(), /* mustBeInitial = */ true);
      if (!maybeOtpToken.isPresent()) {
        return Either.right(builder.setError(ResetOtpResponse.Error.INVALID_CODE).build());
      }
    }
    // Implies token deletion.
    accountOperationsInterface.resetOtp(userId);
    return Either.right(builder.build());
  }

  @Override
  @ValidateUser
  public void resetOtp(ResetOtpRequest request, StreamObserver<ResetOtpResponse> response) {
    Either<StatusException, ResetOtpResponse> result = _resetOtp(request);
    if (result.isRight()) {
      response.onNext(result.get());
      response.onCompleted();
    } else {
      response.onError(result.getLeft());
    }
  }

  @Override
  @ValidateUser
  public void ackFeaturePrompt(
      AckFeaturePromptRequest request, StreamObserver<AckFeaturePromptResponse> response) {
    accountOperationsInterface.ackFeaturePrompt(
        sessionAccessor.getUserIdentifier(), request.getFeatureType());
    response.onNext(AckFeaturePromptResponse.getDefaultInstance());
    response.onCompleted();
  }
}
