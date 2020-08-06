package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.RequestMetadataInterceptorKeys;
import com.floreina.keyring.keyvalue.KeyValueClient;
import com.floreina.keyring.keyvalue.UserProjection;
import com.floreina.keyring.storage.AccountOperationsInterface;
import com.floreina.keyring.storage.KeyOperationsInterface;
import io.grpc.stub.StreamObserver;

import javax.inject.Inject;
import java.util.Objects;
import java.util.Optional;

import static java.util.stream.Collectors.toList;

public class AuthenticationService extends AuthenticationGrpc.AuthenticationImplBase {
  private AccountOperationsInterface accountOperationsInterface;
  private KeyOperationsInterface keyOperationsInterface;
  private KeyValueClient keyValueClient;
  private Cryptography cryptography;
  private Post post;
  private RequestMetadataInterceptorKeys requestMetadataInterceptorKeys;

  @Inject
  AuthenticationService(
      AccountOperationsInterface accountOperationsInterface,
      KeyOperationsInterface keyOperationsInterface,
      Cryptography cryptography,
      Post post,
      KeyValueClient keyValueClient,
      RequestMetadataInterceptorKeys requestMetadataInterceptorKeys) {
    this.accountOperationsInterface = accountOperationsInterface;
    this.keyOperationsInterface = keyOperationsInterface;
    this.cryptography = cryptography;
    this.post = post;
    this.keyValueClient = keyValueClient;
    this.requestMetadataInterceptorKeys = requestMetadataInterceptorKeys;
  }

  @Override
  public void register(RegisterRequest request, StreamObserver<RegisterResponse> response) {
    String username = request.getUsername();
    if (accountOperationsInterface.getUserByName(username).isPresent()) {
      response.onNext(
          RegisterResponse.newBuilder().setError(RegisterResponse.Error.NAME_TAKEN).build());
    } else {
      String salt = request.getSalt();
      String hash = cryptography.computeHash(request.getDigest());
      String mail = request.getMail();
      String code = cryptography.generateSecurityCode();
      User user = accountOperationsInterface.createUser(username, salt, hash, mail, code);
      String sessionKey = keyValueClient.createSession(UserProjection.fromUser(user));
      accountOperationsInterface.createSession(
          user.getIdentifier(),
          sessionKey,
          requestMetadataInterceptorKeys.getIpAddress(),
          requestMetadataInterceptorKeys.getUserAgent());
      post.sendCode(mail, code);
      response.onNext(RegisterResponse.newBuilder().setSessionKey(sessionKey).build());
    }
    response.onCompleted();
  }

  @Override
  public void getSalt(GetSaltRequest request, StreamObserver<GetSaltResponse> response) {
    Optional<User> maybeUser = accountOperationsInterface.getUserByName(request.getUsername());
    if (!maybeUser.isPresent()) {
      response.onNext(
          GetSaltResponse.newBuilder().setError(GetSaltResponse.Error.NOT_FOUND).build());
    } else {
      response.onNext(GetSaltResponse.newBuilder().setSalt(maybeUser.get().getSalt()).build());
    }
    response.onCompleted();
  }

  @Override
  public void logIn(LogInRequest request, StreamObserver<LogInResponse> response) {
    Optional<User> maybeUser = accountOperationsInterface.getUserByName(request.getUsername());
    if (!maybeUser.isPresent()) {
      response.onNext(
          LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
    } else {
      User user = maybeUser.get();
      if (!Utilities.doesDigestMatchUser(cryptography, user, request.getDigest())
          || Objects.equals(user.getState(), User.State.DELETED)) {
        response.onNext(
            LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
      } else {
        String sessionKey = keyValueClient.createSession(UserProjection.fromUser(user));
        accountOperationsInterface.createSession(
            user.getIdentifier(),
            sessionKey,
            requestMetadataInterceptorKeys.getIpAddress(),
            requestMetadataInterceptorKeys.getUserAgent());
        LogInResponse.Payload.Builder payloadBuilder = LogInResponse.Payload.newBuilder();
        payloadBuilder.setSessionKey(sessionKey);
        if (user.getMail() == null) {
          payloadBuilder.addRequirements(LogInResponse.Payload.Requirement.MAIL);
          payloadBuilder.setRequiresMailVerification(true);
        }
        payloadBuilder.setKeySet(
            LogInResponse.Payload.KeySet.newBuilder()
                .addAllItems(
                    keyOperationsInterface
                        .readKeys(user.getIdentifier())
                        .stream()
                        .map(Utilities::entityToIdentifiedKey)
                        .collect(toList()))
                .build());
        response.onNext(LogInResponse.newBuilder().setPayload(payloadBuilder.build()).build());
      }
    }
    response.onCompleted();
  }
}
