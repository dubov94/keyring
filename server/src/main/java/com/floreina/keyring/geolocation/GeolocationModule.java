package com.floreina.keyring.geolocation;

import com.floreina.keyring.Environment;
import com.floreina.keyring.Geolocation;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.gson.GsonFactory;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;

@Module
public class GeolocationModule {
  @Provides
  @Singleton
  static GeolocationServiceInterface provideGeolocationServiceInterface(Environment environment) {
    if (environment.isProduction()) {
      GsonFactory gsonFactory = new GsonFactory();
      HttpRequestFactory httpRequestFactory =
          new NetHttpTransport()
              .createRequestFactory(
                  httpRequest -> httpRequest.setParser(new JsonObjectParser(gsonFactory)));
      return new GeolocationServiceClient(
          httpRequestFactory, environment.getGeolocationAddress());
    } else {
      return ip -> Geolocation.getDefaultInstance();
    }
  }
}
