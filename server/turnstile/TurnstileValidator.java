package io.paveldubov.turnstile;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.UrlEncodedContent;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.util.Key;
import com.google.common.collect.ImmutableMap;
import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class TurnstileValidator {
  private static final String TURNSTILE_VERIFICATION_URL =
      "https://challenges.cloudflare.com/turnstile/v0/siteverify";

  private final HttpRequestFactory httpRequestFactory;
  private final String siteSecretKey;

  TurnstileValidator(
      HttpTransport httpTransport, JsonObjectParser jsonObjectParser, String siteSecretKey) {
    this.httpRequestFactory =
        httpTransport.createRequestFactory(httpRequest -> httpRequest.setParser(jsonObjectParser));
    this.siteSecretKey = siteSecretKey;
  }

  public static TurnstileValidatorBuilder newBuilder() {
    return new TurnstileValidatorBuilder();
  }

  public static TurnstileValidator newDefaultInstance(String siteSecretKey) {
    return newBuilder().build(siteSecretKey);
  }

  public static final class ResponseGson {
    @Key public boolean success;

    @Key public String challenge_ts;

    @Key public String hostname;

    @Key public List<String> error_codes;

    @Key public String action;

    @Key public String cdata;

    public TurnstileResponse toTurnstileResponse() {
      return TurnstileResponse.newBuilder()
          .setSuccess(success)
          .setChallengeTs(Instant.parse(challenge_ts))
          .setHostname(hostname == null ? "" : hostname)
          .setErrorCodes(
              error_codes == null
                  ? Collections.emptyList()
                  : error_codes.stream()
                      .map(TurnstileError::fromString)
                      .collect(Collectors.toList()))
          .setAction(action == null ? "" : action)
          .setCdata(action == null ? "" : cdata)
          .build();
    }
  }

  private ResponseGson executeVerification(ImmutableMap<String, String> params) {
    try {
      HttpRequest request =
          httpRequestFactory.buildPostRequest(
              new GenericUrl(TURNSTILE_VERIFICATION_URL), new UrlEncodedContent(params));
      return request.execute().parseAs(ResponseGson.class);
    } catch (IOException exception) {
      throw new TurnstileException(exception);
    }
  }

  public TurnstileResponse validate(TurnstileRequest request) {
    ImmutableMap.Builder<String, String> paramsBuilder = ImmutableMap.builder();
    paramsBuilder.put("secret", siteSecretKey);
    paramsBuilder.put("response", request.response());
    request.remoteIp().ifPresent(remoteIp -> paramsBuilder.put("remoteip", remoteIp));
    ResponseGson responseGson = executeVerification(paramsBuilder.build());
    return responseGson.toTurnstileResponse();
  }
}
