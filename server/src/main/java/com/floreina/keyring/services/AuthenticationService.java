package com.floreina.keyring.services;

import com.floreina.keyring.*;
import com.floreina.keyring.database.AccountingInterface;
import com.floreina.keyring.entities.User;
import com.floreina.keyring.sessions.SessionsClient;
import com.floreina.keyring.sessions.UserCast;
import com.floreina.keyring.templates.CodeBodyRendererFactory;
import com.floreina.keyring.templates.CodeHeadRendererFactory;
import io.grpc.stub.StreamObserver;

import javax.inject.Inject;
import java.util.Objects;
import java.util.Optional;

public class AuthenticationService extends AuthenticationGrpc.AuthenticationImplBase {
  private AccountingInterface accountingInterface;
  private SessionsClient sessionsClient;
  private Cryptography cryptography;
  private Post post;
  private CodeHeadRendererFactory codeHeadRendererFactory;
  private CodeBodyRendererFactory codeBodyRendererFactory;

  @Inject
  AuthenticationService(
      AccountingInterface accountingInterface,
      Cryptography cryptography,
      Post post,
      CodeHeadRendererFactory codeHeadRendererFactory,
      CodeBodyRendererFactory codeBodyRendererFactory,
      SessionsClient sessionsClient) {
    this.accountingInterface = accountingInterface;
    this.cryptography = cryptography;
    this.post = post;
    this.codeHeadRendererFactory = codeHeadRendererFactory;
    this.codeBodyRendererFactory = codeBodyRendererFactory;
    this.sessionsClient = sessionsClient;
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
      Optional<String> sessionKey = sessionsClient.create(UserCast.fromUser(user));
      if (!sessionKey.isPresent()) {
        throw new IllegalStateException();
      } else {
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
        Optional<String> sessionKey = sessionsClient.create(UserCast.fromUser(user));
        if (!sessionKey.isPresent()) {
          throw new IllegalStateException();
        } else {
          response.onNext(
              LogInResponse.newBuilder()
                  .setPayload(
                      LogInResponse.Payload.newBuilder()
                          .setSessionKey(sessionKey.get())
                          .setIsPending(user.getState() == User.State.PENDING)
                          .build())
                  .build());
        }
      }
    }
    response.onCompleted();
  }
}
