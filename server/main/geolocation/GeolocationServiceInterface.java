package server.main.geolocation;

import server.main.proto.service.Geolocation;

public interface GeolocationServiceInterface {
  Geolocation getIpInfo(String ip);
}
