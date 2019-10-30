package com.floreina.keyring.geolocation;

import com.floreina.keyring.Geolocation;

public interface GeolocationServiceInterface {
  Geolocation getIpInfo(String ip);
}
