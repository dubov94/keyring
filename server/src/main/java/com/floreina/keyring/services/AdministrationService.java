package com.floreina.keyring.services;

import static java.util.function.Function.identity;
import static java.util.stream.Collectors.*;

import com.floreina.keyring.Cryptography;
import com.floreina.keyring.MailClient;
import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.geolocation.GeolocationServiceInterface;
import com.floreina.keyring.interceptors.SessionInterceptorKeys;
import com.floreina.keyring.keyvalue.KeyValueClient;
import com.floreina.keyring.keyvalue.UserProjection;
import com.floreina.keyring.proto.service.*;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.KeyOperationsInterface;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import io.grpc.stub.StreamObserver;
import java.util.*;
import javax.inject.Inject;

public class AdministrationService extends AdministrationGrpc.AdministrationImplBase {
  private KeyOperationsInterface keyOperationsInterface;
  private AccountOperationsInterface accountOperationsInterface;
  private GeolocationServiceInterface geolocationServiceInterface;
  private SessionInterceptorKeys sessionInterceptorKeys;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private MailClient mailClient;
  private IGoogleAuthenticator googleAuthenticator;

  @Inject
  AdministrationService(
      KeyOperationsInterface keyOperationsInterface,
      AccountOperationsInterface accountOperationsInterface,
      GeolocationServiceInterface geolocationServiceInterface,
      SessionInterceptorKeys sessionInterceptorKeys,
      KeyValueClient keyValueClient,
      Cryptography cryptography,
      MailClient mailClient,
      IGoogleAuthenticator googleAuthenticator) {
    this.keyOperationsInterface = keyOperationsInterface;
    this.accountOperationsInterface = accountOperationsInterface;
    this.geolocationServiceInterface = geolocationServiceInterface;
    this.sessionInterceptorKeys = sessionInterceptorKeys;
    this.keyValueClient = keyValueClient;
    this.cryptography = cryptography;
    this.mailClient = mailClient;
    this.googleAuthenticator = googleAuthenticator;
  }

  @Override
  @ValidateUser
  public void acquireMailToken(
      AcquireMailTokenRequest request, StreamObserver<AcquireMailTokenResponse> response) {
    long userIdentifier = sessionInterceptorKeys.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new ConcurrentModificationException();
    } else {
      User user = maybeUser.get();
      if (!Utilities.doesDigestMatchUser(cryptography, user, request.getDigest())) {
        response.onNext(
            AcquireMailTokenResponse.newBuilder()
                .setError(AcquireMailTokenResponse.Error.INVALID_DIGEST)
                .build());
      } else {
        String mail = request.getMail();
        String code = cryptography.generateUacs();
        accountOperationsInterface.createMailToken(userIdentifier, mail, code);
        mailClient.sendMailVerificationCode(mail, code);
        response.onNext(AcquireMailTokenResponse.getDefaultInstance());
      }
    }
    response.onCompleted();
  }

  @Override
  @ValidateUser(states = {User.State.PENDING, User.State.ACTIVE})
  public void releaseMailToken(
      ReleaseMailTokenRequest request, StreamObserver<ReleaseMailTokenResponse> response) {
    long userIdentifier = sessionInterceptorKeys.getUserIdentifier();
    Optional<MailToken> maybeMailToken =
        accountOperationsInterface.getMailToken(userIdentifier, request.getCode());
    if (!maybeMailToken.isPresent()) {
      response.onNext(
          ReleaseMailTokenResponse.newBuilder()
              .setError(ReleaseMailTokenResponse.Error.INVALID_CODE)
              .build());
    } else {
      MailToken mailToken = maybeMailToken.get();
      accountOperationsInterface.releaseMailToken(mailToken.getIdentifier());
      response.onNext(ReleaseMailTokenResponse.newBuilder().setMail(mailToken.getMail()).build());
    }
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
            .createKey(sessionInterceptorKeys.getUserIdentifier(), request.getPassword())
            .getIdentifier();
    response.onNext(CreateKeyResponse.newBuilder().setIdentifier(identifier).build());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void readKeys(ReadKeysRequest request, StreamObserver<ReadKeysResponse> response) {
    List<IdentifiedKey> keys =
        keyOperationsInterface.readKeys(sessionInterceptorKeys.getUserIdentifier()).stream()
            .map(Utilities::entityToIdentifiedKey)
            .collect(toList());
    response.onNext(ReadKeysResponse.newBuilder().addAllKeys(keys).build());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void updateKey(UpdateKeyRequest request, StreamObserver<UpdateKeyResponse> response) {
    keyOperationsInterface.updateKey(sessionInterceptorKeys.getUserIdentifier(), request.getKey());
    response.onNext(UpdateKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void deleteKey(DeleteKeyRequest request, StreamObserver<DeleteKeyResponse> response) {
    keyOperationsInterface.deleteKey(
        sessionInterceptorKeys.getUserIdentifier(), request.getIdentifier());
    response.onNext(DeleteKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void changeMasterKey(
      ChangeMasterKeyRequest request, StreamObserver<ChangeMasterKeyResponse> response) {
    long identifier = sessionInterceptorKeys.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(identifier);
    if (!maybeUser.isPresent()) {
      throw new ConcurrentModificationException();
    } else {
      User user = maybeUser.get();
      if (!Utilities.doesDigestMatchUser(cryptography, user, request.getCurrentDigest())) {
        response.onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.INVALID_CURRENT_DIGEST)
                .build());
      } else {
        ChangeMasterKeyRequest.Renewal renewal = request.getRenewal();
        accountOperationsInterface.changeMasterKey(
            identifier,
            renewal.getSalt(),
            cryptography.computeHash(renewal.getDigest()),
            renewal.getKeysList());
        List<Session> sessions = accountOperationsInterface.readSessions(identifier);
        keyValueClient.dropSessions(sessions.stream().map(Session::getKey).collect(toList()));
        String sessionKey = keyValueClient.createSession(UserProjection.fromUser(user));
        response.onNext(ChangeMasterKeyResponse.newBuilder().setSessionKey(sessionKey).build());
      }
    }
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void changeUsername(
      ChangeUsernameRequest request, StreamObserver<ChangeUsernameResponse> response) {
    long userIdentifier = sessionInterceptorKeys.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new ConcurrentModificationException();
    } else {
      User user = maybeUser.get();
      if (!Utilities.doesDigestMatchUser(cryptography, user, request.getDigest())) {
        response.onNext(
            ChangeUsernameResponse.newBuilder()
                .setError(ChangeUsernameResponse.Error.INVALID_DIGEST)
                .build());
      } else if (accountOperationsInterface.getUserByName(request.getUsername()).isPresent()) {
        response.onNext(
            ChangeUsernameResponse.newBuilder()
                .setError(ChangeUsernameResponse.Error.NAME_TAKEN)
                .build());
      } else {
        accountOperationsInterface.changeUsername(userIdentifier, request.getUsername());
        response.onNext(ChangeUsernameResponse.getDefaultInstance());
      }
    }
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void deleteAccount(
      DeleteAccountRequest request, StreamObserver<DeleteAccountResponse> response) {
    long userIdentifier = sessionInterceptorKeys.getUserIdentifier();
    Optional<User> maybeUser = accountOperationsInterface.getUserByIdentifier(userIdentifier);
    if (!maybeUser.isPresent()) {
      throw new ConcurrentModificationException();
    } else {
      User user = maybeUser.get();
      if (!Utilities.doesDigestMatchUser(cryptography, user, request.getDigest())) {
        response.onNext(
            DeleteAccountResponse.newBuilder()
                .setError(DeleteAccountResponse.Error.INVALID_DIGEST)
                .build());
      } else {
        keyValueClient.dropSessions(
            accountOperationsInterface.readSessions(userIdentifier).stream()
                .map(Session::getKey)
                .collect(toList()));
        accountOperationsInterface.markAccountAsDeleted(userIdentifier);
        response.onNext(DeleteAccountResponse.getDefaultInstance());
      }
    }
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void getRecentSessions(
      GetRecentSessionsRequest request, StreamObserver<GetRecentSessionsResponse> response) {
    long userIdentifier = sessionInterceptorKeys.getUserIdentifier();
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

  @Override
  @ValidateUser
  public void generateOtpParams(
      GenerateOtpParamsRequest request, StreamObserver<GenerateOtpParamsResponse> response) {
    GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
    response.onNext(
        GenerateOtpParamsResponse.newBuilder()
            .setSharedSecret(key.getKey())
            .addAllScratchCodes(key.getScratchCodes())
            .build());
    response.onCompleted();
  }
}
