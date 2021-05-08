package server.main;

import server.main.interceptors.RequestMetadataInterceptor;
import server.main.interceptors.RequestMetadataInterceptorKeys;
import server.main.interceptors.SessionInterceptorKeys;
import server.main.interceptors.VersionInterceptor;
import com.google.gson.Gson;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;
import java.security.SecureRandom;

@Module
class AppModule {
  private static final int UACS_LENGTH = 6;

  @Provides
  @Singleton
  static Cryptography provideCryptography() {
    return new Cryptography(new SecureRandom(), UACS_LENGTH);
  }

  @Provides
  @Singleton
  static Gson provideGson() {
    return new Gson();
  }

  @Provides
  @Singleton
  static SessionInterceptorKeys provideSessionKeys() {
    return new SessionInterceptorKeys();
  }

  @Provides
  @Singleton
  static RequestMetadataInterceptor provideUserMetadataInterceptor() {
    return new RequestMetadataInterceptor();
  }

  @Provides
  @Singleton
  static RequestMetadataInterceptorKeys provideUserMetadataKeys() {
    return new RequestMetadataInterceptorKeys();
  }

  @Provides
  @Singleton
  static Chronometry provideChronometry() {
    return new Chronometry();
  }

  @Provides
  @Singleton
  static VersionInterceptor provideVersionInterceptor() {
    return new VersionInterceptor();
  }

  @Provides
  @Singleton
  static IGoogleAuthenticator provideGoogleAuthenticator() {
    return new GoogleAuthenticator();
  }
}
