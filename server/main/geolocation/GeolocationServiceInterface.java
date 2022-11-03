package keyring.server.main.geolocation;

import keyring.server.main.proto.service.Geolocation;

public interface GeolocationServiceInterface {
  Geolocation getIpInfo(String ip);
}
