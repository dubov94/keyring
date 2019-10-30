package com.floreina.keyring.geolocation;

import com.floreina.keyring.Geolocation;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.LowLevelHttpRequest;
import com.google.api.client.http.LowLevelHttpResponse;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.gson.GsonFactory;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeolocationServiceClientTest {
  @Test
  void getIpInfo_getsCountryAndCity_setsCountryAndCity() {
    GeolocationServiceClient geolocationServiceClient =
        new GeolocationServiceClient(
            createRequestFactoryForGetIpInfo(
                "ip-location",
                "127.0.0.1",
                "{\"country\": {\"names\": {\"en\": \"Country\"}}, "
                    + "\"city\": {\"names\": {\"en\": \"City\"}}}"),
            "ip-location");

    Geolocation geolocation = geolocationServiceClient.getIpInfo("127.0.0.1");

    assertEquals("Country", geolocation.getCountry());
    assertEquals("City", geolocation.getCity());
  }

  @Test
  void getIpInfo_getsNoData_setsNoData() {
    GeolocationServiceClient geolocationServiceClient = new GeolocationServiceClient(createRequestFactoryForGetIpInfo("ip-location", "127.0.0.1", "{}"), "ip-location");

    Geolocation geolocation = geolocationServiceClient.getIpInfo("127.0.0.1");

    assertEquals(Geolocation.getDefaultInstance(), geolocation);
  }

  private HttpRequestFactory createRequestFactoryForGetIpInfo(
      String endpoint, String ip, String response) {
    return new HttpTransport() {
      @Override
      protected LowLevelHttpRequest buildRequest(String requestMethod, String urlString)
          throws IOException {
        assertEquals("GET", requestMethod);
        assertEquals(String.format("http://%s/get-ip-info/%s", endpoint, ip), urlString);
        return new LowLevelHttpRequest() {
          @Override
          public void addHeader(String name, String value) throws IOException {}

          @Override
          public LowLevelHttpResponse execute() throws IOException {
            return new LowLevelHttpResponse() {
              @Override
              public InputStream getContent() throws IOException {
                return new ByteArrayInputStream(response.getBytes());
              }

              @Override
              public String getContentEncoding() throws IOException {
                return null;
              }

              @Override
              public long getContentLength() throws IOException {
                return 0;
              }

              @Override
              public String getContentType() throws IOException {
                return null;
              }

              @Override
              public String getStatusLine() throws IOException {
                return null;
              }

              @Override
              public int getStatusCode() throws IOException {
                return 200;
              }

              @Override
              public String getReasonPhrase() throws IOException {
                return null;
              }

              @Override
              public int getHeaderCount() throws IOException {
                return 0;
              }

              @Override
              public String getHeaderName(int index) throws IOException {
                return null;
              }

              @Override
              public String getHeaderValue(int index) throws IOException {
                return null;
              }
            };
          }
        };
      }
    }.createRequestFactory(
        httpRequest -> httpRequest.setParser(new JsonObjectParser(new GsonFactory())));
  }
}
