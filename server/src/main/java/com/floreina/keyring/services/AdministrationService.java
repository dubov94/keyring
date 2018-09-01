package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.aspects.Annotations.ValidateUser;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.Activation;
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

  @Inject
  AdministrationService(
      ManagementInterface managementInterface,
      AccountingInterface accountingInterface,
      SessionKeys sessionKeys) {
    this.managementInterface = managementInterface;
    this.accountingInterface = accountingInterface;
    this.sessionKeys = sessionKeys;
  }

  @Override
  @ValidateUser(state = User.State.PENDING)
  public void activate(ActivateRequest request, StreamObserver<ActivateResponse> response) {
    long identifier = sessionKeys.getUserIdentifier();
    Optional<Activation> maybeActivation = accountingInterface.getActivationByUser(identifier);
    if (!maybeActivation.isPresent()) {
      throw new ConcurrentModificationException();
    } else {
      Activation activation = maybeActivation.get();
      if (!request.getCode().equals(activation.getCode())) {
        response.onNext(
            ActivateResponse.newBuilder().setError(ActivateResponse.Error.CODE_MISMATCH).build());
      } else {
        accountingInterface.activateUser(identifier);
        response.onNext(ActivateResponse.getDefaultInstance());
      }
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
        // TODO: Purge other cache.
        response.onNext(
            ChangeMasterKeyResponse.newBuilder()
                .setError(ChangeMasterKeyResponse.Error.NONE)
                .build());
      }
    }
    response.onCompleted();
  }
}
