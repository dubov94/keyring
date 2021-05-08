package server.main.geolocation;

import server.main.proto.service.Geolocation;
import server.main.proto.geoip.GeoIpServiceGrpc;
import server.main.proto.geoip.GetIpInfoRequest;
import server.main.proto.geoip.GetIpInfoResponse;

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
