package com.floreina.keyring.geolocation;

import com.floreina.keyring.proto.service.Geolocation;
import com.floreina.keyring.proto.geoip.GeoIpServiceGrpc;
import com.floreina.keyring.proto.geoip.GetIpInfoRequest;
import com.floreina.keyring.proto.geoip.GetIpInfoResponse;

class GeolocationServiceClient implements GeolocationServiceInterface {
  private GeoIpServiceGrpc.GeoIpServiceBlockingStub stub;

  GeolocationServiceClient(GeoIpServiceGrpc.GeoIpServiceBlockingStub stub) {
    this.stub = stub;
  }

  @Override
  public Geolocation getIpInfo(String ip) {
    GetIpInfoRequest request = GetIpInfoRequest.newBuilder().setIpAddress(ip).build();
    GetIpInfoResponse response = stub.getIpInfo(request);
    return Geolocation.newBuilder()
        .setCountry(response.getCountry().getNames().getEn())
        .setCity(response.getCity().getNames().getEn())
        .build();
  }
}
