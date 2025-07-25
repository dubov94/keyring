package keyring.server.main.services;

import static java.util.function.Function.identity;
import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;
import static java.util.stream.Collectors.toSet;
import static keyring.server.main.storage.AccountOperationsInterface.MtNudgeStatus;

import com.google.common.collect.ImmutableList;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.stub.StreamObserver;
import io.vavr.Tuple2;
import io.vavr.control.Either;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import javax.inject.Inject;
import keyring.server.main.Chronometry;
import keyring.server.main.Cryptography;
import keyring.server.main.MailValidation;
import keyring.server.main.aspects.Annotations.ValidateUser;
import keyring.server.main.aspects.Annotations.WithEntityManager;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.OtpToken;
import keyring.server.main.entities.Session;
import keyring.server.main.entities.User;
import keyring.server.main.entities.columns.SessionStage;
import keyring.server.main.entities.columns.UserState;
import keyring.server.main.geolocation.GeolocationServiceInterface;
import keyring.server.main.interceptors.AgentAccessor;
import keyring.server.main.interceptors.SessionAccessor;
import keyring.server.main.interceptors.VersionAccessor;
import keyring.server.main.keyvalue.KeyValueClient;
import keyring.server.main.messagebroker.MessageBrokerClient;
import keyring.server.main.proto.service.AcceptOtpParamsRequest;
import keyring.server.main.proto.service.AcceptOtpParamsResponse;
import keyring.server.main.proto.service.AckFeaturePromptRequest;
import keyring.server.main.proto.service.AckFeaturePromptResponse;
import keyring.server.main.proto.service.AcquireMailTokenRequest;
import keyring.server.main.proto.service.AcquireMailTokenResponse;
import keyring.server.main.proto.service.AdministrationGrpc;
import keyring.server.main.proto.service.ChangeMasterKeyRequest;
import keyring.server.main.proto.service.ChangeMasterKeyResponse;
import keyring.server.main.proto.service.ChangeUsernameRequest;
import keyring.server.main.proto.service.ChangeUsernameResponse;
import keyring.server.main.proto.service.CreateKeyRequest;
import keyring.server.main.proto.service.CreateKeyResponse;
import keyring.server.main.proto.service.DeleteAccountRequest;
import keyring.server.main.proto.service.DeleteAccountResponse;
import keyring.server.main.proto.service.DeleteKeyRequest;
import keyring.server.main.proto.service.DeleteKeyResponse;
import keyring.server.main.proto.service.ElectShadowRequest;
import keyring.server.main.proto.service.ElectShadowResponse;
import keyring.server.main.proto.service.GenerateOtpParamsRequest;
import keyring.server.main.proto.service.GenerateOtpParamsResponse;
import keyring.server.main.proto.service.Geolocation;
import keyring.server.main.proto.service.GetRecentSessionsRequest;
import keyring.server.main.proto.service.GetRecentSessionsResponse;
import keyring.server.main.proto.service.ImportKeysRequest;
import keyring.server.main.proto.service.ImportKeysResponse;
import keyring.server.main.proto.service.KeepAliveRequest;
import keyring.server.main.proto.service.KeepAliveResponse;
import keyring.server.main.proto.service.KeyProto;
import keyring.server.main.proto.service.ReadKeysRequest;
import keyring.server.main.proto.service.ReadKeysResponse;
import keyring.server.main.proto.service.ReleaseMailTokenRequest;
import keyring.server.main.proto.service.ReleaseMailTokenResponse;
import keyring.server.main.proto.service.ResetOtpRequest;
import keyring.server.main.proto.service.ResetOtpResponse;
import keyring.server.main.proto.service.TogglePinRequest;
import keyring.server.main.proto.service.TogglePinResponse;
import keyring.server.main.proto.service.UpdateKeyRequest;
import keyring.server.main.proto.service.UpdateKeyResponse;
import keyring.server.main.storage.AccountOperationsInterface;
import keyring.server.main.storage.KeyOperationsInterface;

public class AdministrationService extends AdministrationGrpc.AdministrationImplBase {
  private KeyOperationsInterface keyOperationsInterface;
  private AccountOperationsInterface accountOperationsInterface;
  private GeolocationServiceInterface geolocationServiceInterface;
  private SessionAccessor sessionAccessor;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private MessageBrokerClient messageBrokerClient;
  private IGoogleAuthenticator googleAuthenticator;
  private Chronometry chronometry;
  private MailValidation mailValidation;
  private AgentAccessor agentAccessor;
  private VersionAccessor versionAccessor;

  private static final int OTP_TTS_COUNT = 5;
  private static final String OTP_ISSUER = "parolica.com";

  @Inject
  AdministrationService(
      KeyOperationsInterface keyOperationsInterface,
      AccountOperationsInterface accountOperationsInterface,
      GeolocationServiceInterface geolocationServiceInterface,
      SessionAccessor sessionAccessor,
      KeyValueClient keyValueClient,
      Cryptography cryptography,
      MessageBrokerClient messageBrokerClient,
      IGoogleAuthenticator googleAuthenticator,
      Chronometry chronometry,
      MailValidation mailValidation,
      AgentAccessor agentAccessor,
      VersionAccessor versionAccessor) {
    this.keyOperationsInterface = keyOperationsInterface;
    this.accountOperationsInterface = accountOperationsInterface;
    this.geolocationServiceInterface = geolocationServiceInterface;
    this.sessionAccessor = sessionAccessor;
    this.keyValueClient = keyValueClient;
    this.cryptography = cryptography;
    this.messageBrokerClient = messageBrokerClient;
    this.googleAuthenticator = googleAuthenticator;
    this.chronometry = chronometry;
    this.mailValidation = mailValidation;
    this.agentAccessor = agentAccessor;
    this.versionAccessor = versionAccessor;
  }

  private Either<StatusException, AcquireMailTokenResponse> _acquireMailToken(
      AcquireMailTokenRequest request) {
    String mail = request.getMail();
    if (!mailValidation.checkAddress(mail)) {
      return Either.left(new StatusException(Status.INVALID_ARGUMENT));
    }
    long userId = sessionAccessor.getUserId();
    Optional<User> maybeUser = accountOperationsInterface.getUserById(userId);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    AcquireMailTokenResponse.Builder builder = AcquireMailTokenResponse.newBuilder();
    if (!cryptography.doesDigestMatchHash(request.getDigest(), user.getHash())) {
      return Either.right(builder.setError(AcquireMailTokenResponse.Error.INVALID_DIGEST).build());
    }
    String code = cryptography.generateUacs();
    MailToken mailToken =
        accountOperationsInterface.createMailToken(
            userId, agentAccessor.getIpAddress(), mail, code);
    messageBrokerClient.publishMailVc(mail, user.getUsername(), code);
    return Either.right(builder.setTokenId(mailToken.getIdentifier()).build());
  }

  @Override
  @WithEntityManager
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
    long userId = sessionAccessor.getUserId();
    ReleaseMailTokenResponse.Builder builder = ReleaseMailTokenResponse.newBuilder();
    Tuple2<MtNudgeStatus, Optional<MailToken>> nudgeResult =
        accountOperationsInterface.nudgeMailToken(
            userId,
            request.getTokenId(),
            (lastAttempt, attemptCount) ->
                chronometry.nextAttempt(
                    lastAttempt, attemptCount, /* baseDelayS */ 1, /* graceCount */ 3));
    if (Objects.equals(MtNudgeStatus.NOT_FOUND, nudgeResult._1)) {
      return builder.setError(ReleaseMailTokenResponse.Error.INVALID_TOKEN_ID).build();
    }
    if (Objects.equals(MtNudgeStatus.NOT_AVAILABLE_YET, nudgeResult._1)) {
      return builder.setError(ReleaseMailTokenResponse.Error.TOO_MANY_REQUESTS).build();
    }
    if (!nudgeResult._2.isPresent()) {
      throw new IllegalStateException(
          String.format("`MailToken` is not present, `MtNudgeStatus` is %s", nudgeResult._1));
    }
    MailToken mailToken = nudgeResult._2.get();
    if (!Objects.equals(mailToken.getCode(), request.getCode())) {
      return builder.setError(ReleaseMailTokenResponse.Error.INVALID_CODE).build();
    }
    accountOperationsInterface.releaseMailToken(userId, mailToken.getIdentifier());
    return builder.setMail(mailToken.getMail()).build();
  }

  @Override
  @WithEntityManager
  @ValidateUser(states = {UserState.USER_PENDING, UserState.USER_ACTIVE})
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
  @WithEntityManager
  @ValidateUser
  public void importKeys(ImportKeysRequest request, StreamObserver<ImportKeysResponse> response) {
    List<Key> keys =
        keyOperationsInterface.importKeys(
            sessionAccessor.getSessionEntityId(), request.getPasswordsList());
    response.onNext(
        ImportKeysResponse.newBuilder()
            .addAllKeys(keys.stream().map(Key::toKeyProto).collect(toList()))
            .build());
    response.onCompleted();
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void createKey(CreateKeyRequest request, StreamObserver<CreateKeyResponse> response) {
    Key key =
        keyOperationsInterface.createKey(
            sessionAccessor.getSessionEntityId(), request.getPassword(), request.getAttrs());
    CreateKeyResponse.Builder builder = CreateKeyResponse.newBuilder();
    builder.setIdentifier(key.getIdentifier());
    key.getCreationTimestamp()
        .ifPresent(
            (timestamp) -> {
              builder.setCreationTimeInMillis(timestamp.getTime());
            });
    response.onNext(builder.build());
    response.onCompleted();
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void readKeys(ReadKeysRequest request, StreamObserver<ReadKeysResponse> response) {
    List<KeyProto> keys =
        keyOperationsInterface.readKeys(sessionAccessor.getSessionEntityId()).stream()
            .map(Key::toKeyProto)
            .collect(toList());
    response.onNext(ReadKeysResponse.newBuilder().addAllKeys(keys).build());
    response.onCompleted();
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void updateKey(UpdateKeyRequest request, StreamObserver<UpdateKeyResponse> response) {
    keyOperationsInterface.updateKey(sessionAccessor.getSessionEntityId(), request.getKey());
    response.onNext(UpdateKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void deleteKey(DeleteKeyRequest request, StreamObserver<DeleteKeyResponse> response) {
    keyOperationsInterface.deleteKey(sessionAccessor.getSessionEntityId(), request.getIdentifier());
    response.onNext(DeleteKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void electShadow(
      ElectShadowRequest request, StreamObserver<ElectShadowResponse> response) {
    Tuple2<Key, List<Key>> election =
        keyOperationsInterface.electShadow(
            sessionAccessor.getSessionEntityId(), request.getIdentifier());
    response.onNext(
        ElectShadowResponse.newBuilder()
            .setParent(election._1.getIdentifier())
            .addAllDeletedShadows(election._2.stream().map(Key::getIdentifier).collect(toList()))
            .build());
    response.onCompleted();
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void togglePin(TogglePinRequest request, StreamObserver<TogglePinResponse> response) {
    keyOperationsInterface.togglePin(
        sessionAccessor.getSessionEntityId(), request.getIdentifier(), request.getIsPinned());
    response.onNext(TogglePinResponse.getDefaultInstance());
    response.onCompleted();
  }

  private Optional<StatusException> validateChangeMasterKeyRequest(ChangeMasterKeyRequest request) {
    ChangeMasterKeyRequest.Renewal renewal = request.getRenewal();
    if (!cryptography.validateA2p(renewal.getSalt())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    if (!cryptography.validateDigest(renewal.getDigest())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    return Optional.empty();
  }

  private Either<StatusException, ChangeMasterKeyResponse> _changeMasterKey(
      ChangeMasterKeyRequest request) {
    Optional<StatusException> validation = validateChangeMasterKeyRequest(request);
    if (validation.isPresent()) {
      return Either.left(validation.get());
    }
    long userId = sessionAccessor.getUserId();
    Optional<User> maybeUser = accountOperationsInterface.getUserById(userId);
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
    List<Session> disabledSessions =
        accountOperationsInterface.changeMasterKey(
            userId,
            renewal.getSalt(),
            cryptography.computeHash(renewal.getDigest()),
            renewal.getKeysList());
    keyValueClient.safelyDeleteSeRefs(disabledSessions);

    Session newSessionRecord =
        accountOperationsInterface.createSession(
            userId,
            user.getVersion(),
            agentAccessor.getIpAddress(),
            agentAccessor.getUserAgent(),
            versionAccessor.getVersion());
    long newSessionId = newSessionRecord.getIdentifier();
    String newSessionToken = cryptography.generateTts();
    accountOperationsInterface.activateSession(
        userId, newSessionId, keyValueClient.convertSessionTokenToKey(newSessionToken));
    keyValueClient.createSession(
        newSessionToken, userId, agentAccessor.getIpAddress(), newSessionId);
    return Either.right(builder.setSessionKey(newSessionToken).build());
  }

  @Override
  @WithEntityManager
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

  private Optional<StatusException> validateChangeUsernameRequest(ChangeUsernameRequest request) {
    if (!Validators.checkUsername(request.getUsername())) {
      return Optional.of(new StatusException(Status.INVALID_ARGUMENT));
    }
    return Optional.empty();
  }

  private Either<StatusException, ChangeUsernameResponse> _changeUsername(
      ChangeUsernameRequest request) {
    Optional<StatusException> validation = validateChangeUsernameRequest(request);
    if (validation.isPresent()) {
      return Either.left(validation.get());
    }
    long userId = sessionAccessor.getUserId();
    Optional<User> maybeUser = accountOperationsInterface.getUserById(userId);
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
    accountOperationsInterface.changeUsername(userId, request.getUsername());
    return Either.right(builder.build());
  }

  @Override
  @WithEntityManager
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
    long userId = sessionAccessor.getUserId();
    Optional<User> maybeUser = accountOperationsInterface.getUserById(userId);
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    DeleteAccountResponse.Builder builder = DeleteAccountResponse.newBuilder();
    if (!cryptography.doesDigestMatchHash(request.getDigest(), user.getHash())) {
      return Either.right(builder.setError(DeleteAccountResponse.Error.INVALID_DIGEST).build());
    }
    keyValueClient.safelyDeleteSeRefs(
        accountOperationsInterface.readSessions(
            userId, Optional.of(ImmutableList.of(SessionStage.SESSION_DISABLED))));
    accountOperationsInterface.markAccountAsDeleted(userId);
    return Either.right(builder.build());
  }

  @Override
  @WithEntityManager
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

  private GetRecentSessionsResponse.Session.Status convertSessionStage(SessionStage stage) {
    switch (stage) {
      case UNKNOWN_SESSION_STAGE:
        return GetRecentSessionsResponse.Session.Status.UNKNOWN_STATUS;
      case SESSION_INITIATED:
        return GetRecentSessionsResponse.Session.Status.AWAITING_2FA;
      case SESSION_ACTIVATED:
        return GetRecentSessionsResponse.Session.Status.ACTIVATED;
      case SESSION_DISABLED:
        return GetRecentSessionsResponse.Session.Status.DISABLED;
      default:
        throw new IllegalArgumentException(
            String.format("Unknown `SessionStage`: %s", stage.getValueDescriptor().getName()));
    }
  }

  @Override
  @WithEntityManager
  @ValidateUser
  public void getRecentSessions(
      GetRecentSessionsRequest request, StreamObserver<GetRecentSessionsResponse> response) {
    long userId = sessionAccessor.getUserId();
    List<Session> sessions =
        accountOperationsInterface.readSessions(userId, Optional.empty()).stream()
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
                                .setCreationTimeInMillis(session.getTimestamp().toEpochMilli())
                                .setIpAddress(session.getIpAddress())
                                .setUserAgent(session.getUserAgent())
                                .setGeolocation(ipToGeolocation.get(session.getIpAddress()))
                                .setStatus(convertSessionStage(session.getStage()))
                                .build())
                    .collect(toList()))
            .build());
    response.onCompleted();
  }

  private Either<StatusException, GenerateOtpParamsResponse> _generateOtpParams(
      GenerateOtpParamsRequest request) {
    Optional<User> maybeUser = accountOperationsInterface.getUserById(sessionAccessor.getUserId());
    if (!maybeUser.isPresent()) {
      return Either.left(new StatusException(Status.ABORTED));
    }
    User user = maybeUser.get();
    GoogleAuthenticatorKey credentials = googleAuthenticator.createCredentials();
    String sharedSecret = credentials.getKey();
    List<String> scratchCodes =
        Stream.generate(cryptography::generateTts).limit(OTP_TTS_COUNT).collect(toList());
    OtpParams otpParams =
        accountOperationsInterface.createOtpParams(
            user.getIdentifier(), sharedSecret, scratchCodes);
    return Either.right(
        GenerateOtpParamsResponse.newBuilder()
            .setOtpParamsId(String.valueOf(otpParams.getId()))
            .setSharedSecret(sharedSecret)
            .setKeyUri(
                GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(
                    OTP_ISSUER, user.getUsername(), credentials))
            .addAllScratchCodes(scratchCodes)
            .build());
  }

  @Override
  @WithEntityManager
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
    long userId = sessionAccessor.getUserId();
    Optional<OtpParams> maybeOtpParams =
        accountOperationsInterface.getOtpParams(userId, Long.valueOf(request.getOtpParamsId()));
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
    accountOperationsInterface.acceptOtpParams(userId, otpParams.getId());
    if (request.getYieldTrustedToken()) {
      String otpToken = cryptography.generateTts();
      accountOperationsInterface.createTrustedToken(userId, otpToken);
      builder.setTrustedToken(otpToken);
    }
    return Either.right(builder.build());
  }

  @Override
  @WithEntityManager
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
    long userId = sessionAccessor.getUserId();
    Optional<User> maybeUser = accountOperationsInterface.getUserById(userId);
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
  @WithEntityManager
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
  @WithEntityManager
  @ValidateUser
  public void ackFeaturePrompt(
      AckFeaturePromptRequest request, StreamObserver<AckFeaturePromptResponse> response) {
    accountOperationsInterface.ackFeaturePrompt(
        sessionAccessor.getUserId(), request.getFeatureType());
    response.onNext(AckFeaturePromptResponse.getDefaultInstance());
    response.onCompleted();
  }
}
