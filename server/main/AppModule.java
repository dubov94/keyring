package server.main;

import com.google.gson.Gson;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.IGoogleAuthenticator;
import dagger.Module;
import dagger.Provides;
import io.paveldubov.turnstile.TurnstileValidator;
import java.security.SecureRandom;
import javax.inject.Singleton;
import server.main.interceptors.AgentAccessor;
import server.main.interceptors.AgentInterceptor;
import server.main.interceptors.SessionAccessor;
import server.main.interceptors.VersionAccessor;
import server.main.interceptors.VersionInterceptor;

@Module
class AppModule {
  private static final int UACS_LENGTH = 6;

  @Provides
  @Singleton
  static Arithmetic provideArithmetic() {
    return new Arithmetic();
  }

  @Provides
  @Singleton
  static Cryptography provideCryptography(Arithmetic arithmetic) {
    return new Cryptography(new SecureRandom(), arithmetic, UACS_LENGTH);
  }

  @Provides
  @Singleton
  static Gson provideGson() {
    return new Gson();
  }

  @Provides
  @Singleton
  static SessionAccessor provideSessionAccessor() {
    return new SessionAccessor();
  }

  @Provides
  @Singleton
  static AgentInterceptor provideAgentInterceptor() {
    return new AgentInterceptor();
  }

  @Provides
  @Singleton
  static AgentAccessor provideAgentAccessor() {
    return new AgentAccessor();
  }

  @Provides
  @Singleton
  static Chronometry provideChronometry(Arithmetic arithmetic) {
    return new Chronometry(arithmetic);
  }

  @Provides
  @Singleton
  static VersionInterceptor provideVersionInterceptor() {
    return new VersionInterceptor();
  }

  @Provides
  @Singleton
  static VersionAccessor provideVersionAccessor() {
    return new VersionAccessor();
  }

  @Provides
  @Singleton
  static IGoogleAuthenticator provideGoogleAuthenticator() {
    return new GoogleAuthenticator();
  }

  @Provides
  @Singleton
  static TurnstileValidator provideTurnstileValidator(Environment environment) {
    // https://developers.cloudflare.com/turnstile/frequently-asked-questions/#are-there-sitekeys-and-secret-keys-that-can-be-used-for-testing
    return TurnstileValidator.newDefaultInstance(
        environment.isProduction()
            ? environment.getTurnstileSecretKey()
            : "1x0000000000000000000000000000000AA");
  }
}
