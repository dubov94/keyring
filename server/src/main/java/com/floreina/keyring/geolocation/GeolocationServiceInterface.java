package com.floreina.keyring.geolocation;

import com.floreina.keyring.proto.service.Geolocation;

public interface GeolocationServiceInterface {
  Geolocation getIpInfo(String ip);
}
