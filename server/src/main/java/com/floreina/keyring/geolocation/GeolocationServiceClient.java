package com.floreina.keyring.geolocation;

import com.floreina.keyring.Geolocation;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.util.Key;

import java.io.IOException;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

class GeolocationServiceClient implements GeolocationServiceInterface {
  private static final Logger logger = Logger.getLogger(GeolocationServiceClient.class.getName());

  private HttpRequestFactory httpRequestFactory;
  private String serviceEndpoint;

  GeolocationServiceClient(HttpRequestFactory httpRequestFactory, String serviceEndpoint) {
    this.httpRequestFactory = httpRequestFactory;
    this.serviceEndpoint = serviceEndpoint;
  }

  @Override
  public Geolocation getIpInfo(String ip) {
    try {
      HttpRequest httpRequest =
          httpRequestFactory.buildGetRequest(new GetIpInfoUrl(serviceEndpoint, ip));
      IpInfo ipInfo = httpRequest.execute().parseAs(IpInfo.class);
      Geolocation.Builder geolocationBuilder = Geolocation.newBuilder();
      ipInfo.getCountryInEnglish().ifPresent(geolocationBuilder::setCountry);
      ipInfo.getCityInEnglish().ifPresent(geolocationBuilder::setCity);
      return geolocationBuilder.build();
    } catch (IOException exception) {
      logger.log(Level.WARNING, "Unable to fetch IP info", exception);
      return Geolocation.getDefaultInstance();
    }
  }

  static class GetIpInfoUrl extends GenericUrl {
    GetIpInfoUrl(String endpoint, String ip) {
      super(String.format("http://%s/get-ip-info/%s", endpoint, ip));
    }
  }

  public static class IpInfo {
    @Key private Country country;
    @Key private City city;

    Optional<String> getCountryInEnglish() {
      return Optional.ofNullable(country).flatMap(Country::getEnglishName);
    }

    Optional<String> getCityInEnglish() {
      return Optional.ofNullable(city).flatMap(City::getEnglishName);
    }

    public static class Names {
      @Key private String en;

      Optional<String> getEnglish() {
        return Optional.ofNullable(en);
      }
    }

    public static class Country {
      @Key private Names names;

      Optional<String> getEnglishName() {
        return Optional.ofNullable(names).flatMap(Names::getEnglish);
      }
    }

    public static class City {
      @Key Names names;

      Optional<String> getEnglishName() {
        return Optional.ofNullable(names).flatMap(Names::getEnglish);
      }
    }
  }
}
