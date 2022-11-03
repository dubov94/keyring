package keyring.server.main.geolocation;

import dagger.Module;
import dagger.Provides;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import javax.inject.Singleton;
import keyring.server.main.Environment;
import keyring.server.main.proto.geoip.GeoIpServiceGrpc;
import keyring.server.main.proto.service.Geolocation;

@Module
public class GeolocationModule {
  @Provides
  @Singleton
  static GeolocationServiceInterface provideGeolocationServiceInterface(Environment environment) {
    if (environment.isProduction()) {
      ManagedChannel channel =
          ManagedChannelBuilder.forTarget(environment.getGeolocationAddress())
              .usePlaintext()
              .build();
      GeoIpServiceGrpc.GeoIpServiceBlockingStub stub = GeoIpServiceGrpc.newBlockingStub(channel);
      return new GeolocationServiceClient(stub);
    } else {
      return ip -> Geolocation.getDefaultInstance();
    }
  }
}
