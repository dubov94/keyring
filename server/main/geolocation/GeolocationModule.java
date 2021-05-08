package server.main.geolocation;

import server.main.Environment;
import server.main.proto.service.Geolocation;
import server.main.proto.geoip.GeoIpServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;

@Module
public class GeolocationModule {
  @Provides
  @Singleton
  static GeolocationServiceInterface provideGeolocationServiceInterface(Environment environment) {
    if (environment.isProduction()) {
      ManagedChannel channel = ManagedChannelBuilder.forTarget(
          environment.getGeolocationAddress()).usePlaintext().build();
      GeoIpServiceGrpc.GeoIpServiceBlockingStub stub = GeoIpServiceGrpc.newBlockingStub(channel);
      return new GeolocationServiceClient(stub);
    } else {
      return ip -> Geolocation.getDefaultInstance();
    }
  }
}
