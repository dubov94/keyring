package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.cache.CacheClient;
import com.floreina.keyring.cache.UserCast;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.database.ManagementInterface;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.interceptors.RecognitionKeys;
import com.floreina.keyring.templates.CodeBodyRendererFactory;
import com.floreina.keyring.templates.CodeHeadRendererFactory;
import io.grpc.stub.StreamObserver;

import javax.inject.Inject;
import java.util.Objects;
import java.util.Optional;

import static java.util.stream.Collectors.toList;

public class AuthenticationService extends AuthenticationGrpc.AuthenticationImplBase {
  private AccountingInterface accountingInterface;
  private ManagementInterface managementInterface;
  private CacheClient cacheClient;
  private Cryptography cryptography;
  private Post post;
  private CodeHeadRendererFactory codeHeadRendererFactory;
  private CodeBodyRendererFactory codeBodyRendererFactory;
  private RecognitionKeys recognitionKeys;

  @Inject
  AuthenticationService(
      AccountingInterface accountingInterface,
      ManagementInterface managementInterface,
      Cryptography cryptography,
      Post post,
      CodeHeadRendererFactory codeHeadRendererFactory,
      CodeBodyRendererFactory codeBodyRendererFactory,
      CacheClient cacheClient,
      RecognitionKeys recognitionKeys) {
    this.accountingInterface = accountingInterface;
    this.managementInterface = managementInterface;
    this.cryptography = cryptography;
    this.post = post;
    this.codeHeadRendererFactory = codeHeadRendererFactory;
    this.codeBodyRendererFactory = codeBodyRendererFactory;
    this.cacheClient = cacheClient;
    this.recognitionKeys = recognitionKeys;
  }

  @Override
  public void register(RegisterRequest request, StreamObserver<RegisterResponse> response) {
    String username = request.getUsername();
    if (accountingInterface.getUserByName(username).isPresent()) {
      response.onNext(
          RegisterResponse.newBuilder().setError(RegisterResponse.Error.NAME_TAKEN).build());
    } else {
      String salt = request.getSalt();
      String digest = request.getDigest();
      String mail = request.getMail();
      String code = cryptography.generateSecurityCode();
      User user = accountingInterface.createUserWithActivation(username, salt, digest, mail, code);
      Optional<String> sessionKey = cacheClient.create(UserCast.fromUser(user));
      if (!sessionKey.isPresent()) {
        throw new IllegalStateException();
      } else {
        accountingInterface.createSession(
            user.getIdentifier(),
            sessionKey.get(),
            recognitionKeys.getIpAddress(),
            recognitionKeys.getUserAgent());
        String head = codeHeadRendererFactory.newRenderer().setCode(code).render();
        String body = codeBodyRendererFactory.newRenderer().setCode(code).render();
        post.send(mail, head, body);
        response.onNext(RegisterResponse.newBuilder().setSessionKey(sessionKey.get()).build());
      }
    }
    response.onCompleted();
  }

  @Override
  public void getSalt(GetSaltRequest request, StreamObserver<GetSaltResponse> response) {
    Optional<User> maybeUser = accountingInterface.getUserByName(request.getUsername());
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
    Optional<User> maybeUser = accountingInterface.getUserByName(request.getUsername());
    if (!maybeUser.isPresent()) {
      response.onNext(
          LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
    } else {
      User user = maybeUser.get();
      if (!Objects.equals(request.getDigest(), user.getDigest())) {
        response.onNext(
            LogInResponse.newBuilder().setError(LogInResponse.Error.INVALID_CREDENTIALS).build());
      } else {
        Optional<String> sessionKey = cacheClient.create(UserCast.fromUser(user));
        if (!sessionKey.isPresent()) {
          throw new IllegalStateException();
        } else {
          accountingInterface.createSession(
              user.getIdentifier(),
              sessionKey.get(),
              recognitionKeys.getIpAddress(),
              recognitionKeys.getUserAgent());
          LogInResponse.Payload.Builder payloadBuilder = LogInResponse.Payload.newBuilder();
          payloadBuilder.setSessionKey(sessionKey.get());
          if (user.getState() == User.State.PENDING) {
            payloadBuilder.setChallenge(LogInResponse.Payload.Challenge.ACTIVATE);
          } else {
            payloadBuilder.setKeySet(
                LogInResponse.Payload.KeySet.newBuilder()
                    .addAllItems(
                        managementInterface
                            .readKeys(user.getIdentifier())
                            .stream()
                            .map(Utilities::entityToIdentifiedKey)
                            .collect(toList()))
                    .build());
          }
          response.onNext(LogInResponse.newBuilder().setPayload(payloadBuilder.build()).build());
        }
      }
    }
    response.onCompleted();
  }
}
