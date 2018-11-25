package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.cache.CacheClient;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.MailToken;
import com.floreina.keyring.entities.Session;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.SessionKeys;
import io.grpc.stub.StreamObserver;

import javax.inject.Inject;
import java.util.ConcurrentModificationException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static java.util.stream.Collectors.toList;

public class AdministrationService extends AdministrationGrpc.AdministrationImplBase {
  private ManagementInterface managementInterface;
  private AccountingInterface accountingInterface;
  private SessionKeys sessionKeys;
  private CacheClient cacheClient;

  @Inject
  AdministrationService(
      ManagementInterface managementInterface,
      AccountingInterface accountingInterface,
      SessionKeys sessionKeys,
      CacheClient cacheClient) {
    this.managementInterface = managementInterface;
    this.accountingInterface = accountingInterface;
    this.sessionKeys = sessionKeys;
    this.cacheClient = cacheClient;
  }

  @Override
  @ValidateUser(states = {ValidateUser.UserState.PENDING, ValidateUser.UserState.ACTIVE})
  public void releaseMailToken(
      ReleaseMailTokenRequest request, StreamObserver<ReleaseMailTokenResponse> response) {
    long userIdentifier = sessionKeys.getUserIdentifier();
    Optional<MailToken> maybeMailToken =
        accountingInterface.getMailToken(userIdentifier, request.getCode());
    if (!maybeMailToken.isPresent()) {
      response.onNext(
          ReleaseMailTokenResponse.newBuilder()
              .setError(ReleaseMailTokenResponse.Error.INVALID_CODE)
              .build());
    } else {
      accountingInterface.releaseMailToken(maybeMailToken.get().getIdentifier());
      response.onNext(ReleaseMailTokenResponse.getDefaultInstance());
    }
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void createKey(CreateKeyRequest request, StreamObserver<CreateKeyResponse> response) {
    long identifier =
        managementInterface
            .createKey(sessionKeys.getUserIdentifier(), request.getPassword())
            .getIdentifier();
    response.onNext(CreateKeyResponse.newBuilder().setIdentifier(identifier).build());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void readKeys(ReadKeysRequest request, StreamObserver<ReadKeysResponse> response) {
    List<IdentifiedKey> keys =
        managementInterface
            .readKeys(sessionKeys.getUserIdentifier())
            .stream()
            .map(Utilities::entityToIdentifiedKey)
            .collect(toList());
    response.onNext(ReadKeysResponse.newBuilder().addAllKeys(keys).build());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void updateKey(UpdateKeyRequest request, StreamObserver<UpdateKeyResponse> response) {
    managementInterface.updateKey(sessionKeys.getUserIdentifier(), request.getKey());
    response.onNext(UpdateKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void deleteKey(DeleteKeyRequest request, StreamObserver<DeleteKeyResponse> response) {
    managementInterface.deleteKey(sessionKeys.getUserIdentifier(), request.getIdentifier());
    response.onNext(DeleteKeyResponse.getDefaultInstance());
    response.onCompleted();
  }

  @Override
  @ValidateUser
  public void changeMasterKey(
      ChangeMasterKeyRequest request, StreamObserver<ChangeMasterKeyResponse> response) {
    long identifier = sessionKeys.getUserIdentifier();
    Optional<User> maybeUser = accountingInterface.getUserByIdentifier(identifier);
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
        accountingInterface.changeMasterKey(
            identifier, renewal.getSalt(), renewal.getDigest(), renewal.getKeysList());
        List<Session> sessions = accountingInterface.readSessions(identifier);
        cacheClient.drop(
            sessions
                .stream()
                .map(Session::getKey)
                .filter(key -> !Objects.equals(key, sessionKeys.getSessionIdentifier()))
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
