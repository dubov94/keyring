package io.paveldubov.turnstile;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Optional;

public final class TurnstileValidatorBuilder {
  private Optional<HttpTransport> httpTransport = Optional.empty();
  private Optional<JsonObjectParser> jsonObjectParser = Optional.empty();

  TurnstileValidatorBuilder() {}

  public TurnstileValidatorBuilder setHttpTransport(HttpTransport httpTransport) {
    this.httpTransport = Optional.of(httpTransport);
    return this;
  }

  public TurnstileValidatorBuilder setJsonObjectParser(JsonObjectParser jsonObjectParser) {
    this.jsonObjectParser = Optional.of(jsonObjectParser);
    return this;
  }

  public TurnstileValidator build(String siteSecretKey) {
    return new TurnstileValidator(
        httpTransport.orElseGet(() -> new NetHttpTransport()),
        jsonObjectParser.orElseGet(() -> new JsonObjectParser(GsonFactory.getDefaultInstance())),
        siteSecretKey);
  }
}
