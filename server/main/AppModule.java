package server.main;

import com.google.gson.Gson;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import dagger.Module;
import dagger.Provides;
import java.security.SecureRandom;
import javax.inject.Singleton;
import server.main.interceptors.AgentAccessor;
import server.main.interceptors.AgentInterceptor;
import server.main.interceptors.SessionAccessor;
import server.main.interceptors.VersionInterceptor;

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
  static SessionAccessor provideSessionKeys() {
    return new SessionAccessor();
  }

  @Provides
  @Singleton
  static AgentInterceptor provideUserMetadataInterceptor() {
    return new AgentInterceptor();
  }

  @Provides
  @Singleton
  static AgentAccessor provideUserMetadataKeys() {
    return new AgentAccessor();
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
