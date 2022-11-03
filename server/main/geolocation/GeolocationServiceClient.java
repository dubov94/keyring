package keyring.server.main.geolocation;

import keyring.server.main.proto.geoip.GeoIpServiceGrpc;
import keyring.server.main.proto.geoip.GetIpInfoRequest;
import keyring.server.main.proto.geoip.GetIpInfoResponse;
import keyring.server.main.proto.service.Geolocation;

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
