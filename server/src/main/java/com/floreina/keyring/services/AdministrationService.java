package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionInterceptorKeys;
import com.floreina.keyring.keyvalue.KeyValueClient;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.KeyOperationsInterface;
import io.grpc.stub.StreamObserver;

import javax.inject.Inject;
import java.util.ConcurrentModificationException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static java.util.stream.Collectors.toList;

public class AdministrationService extends AdministrationGrpc.AdministrationImplBase {
  private KeyOperationsInterface keyOperationsInterface;
  private AccountOperationsInterface accountOperationsInterface;
  private SessionInterceptorKeys sessionInterceptorKeys;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private Post post;

  @Inject
  AdministrationService(
      KeyOperationsInterface keyOperationsInterface,
      AccountOperationsInterface accountOperationsInterface,
      SessionInterceptorKeys sessionInterceptorKeys,
      KeyValueClient keyValueClient,
      Cryptography cryptography,
      Post post) {
    this.keyOperationsInterface = keyOperationsInterface;
    this.accountOperationsInterface = accountOperationsInterface;
    this.sessionInterceptorKeys = sessionInterceptorKeys;
    this.keyValueClient = keyValueClient;
    this.cryptography = cryptography;
    this.post = post;
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
      if (!Objects.equals(request.getDigest(), user.getDigest())) {
        response.onNext(
            AcquireMailTokenResponse.newBuilder()
                .setError(AcquireMailTokenResponse.Error.INVALID_DIGEST)
                .build());
      } else {
        String mail = request.getMail();
        String code = cryptography.generateSecurityCode();
        accountOperationsInterface.createMailToken(userIdentifier, mail, code);
        post.sendCode(mail, code);
        response.onNext(AcquireMailTokenResponse.getDefaultInstance());
      }
    }
    response.onCompleted();
  }

  @Override
  @ValidateUser(states = {ValidateUser.UserState.PENDING, ValidateUser.UserState.ACTIVE})
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
      accountOperationsInterface.releaseMailToken(maybeMailToken.get().getIdentifier());
      response.onNext(ReleaseMailTokenResponse.getDefaultInstance());
    }
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
        keyOperationsInterface
            .readKeys(sessionInterceptorKeys.getUserIdentifier())
            .stream()
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
      if (!Objects.equals(request.getCurrentDigest(), user.getDigest())) {
        response.onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.INVALID_CURRENT_DIGEST)
                .build());
      } else {
        ChangeMasterKeyRequest.Renewal renewal = request.getRenewal();
        accountOperationsInterface.changeMasterKey(
            identifier, renewal.getSalt(), renewal.getDigest(), renewal.getKeysList());
        List<Session> sessions = accountOperationsInterface.readSessions(identifier);
        keyValueClient.drop(
            sessions
                .stream()
                .map(Session::getKey)
                .filter(key -> !Objects.equals(key, sessionInterceptorKeys.getSessionIdentifier()))
                .collect(toList()));
        response.onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.NONE)
                .build());
      }
    }
    response.onCompleted();
  }
}
