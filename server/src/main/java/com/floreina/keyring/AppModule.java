package com.floreina.keyring;

import com.floreina.keyring.interceptors.RequestMetadataInterceptor;
import com.floreina.keyring.interceptors.RequestMetadataInterceptorKeys;
import com.floreina.keyring.interceptors.SessionInterceptorKeys;
import com.floreina.keyring.interceptors.VersionInterceptor;
import com.google.gson.Gson;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;
import java.security.SecureRandom;

@Module
class AppModule {
  private static final int SECURITY_CODE_LENGTH = 6;

  @Provides
  @Singleton
  static Cryptography provideCryptography() {
    return new Cryptography(new SecureRandom(), SECURITY_CODE_LENGTH);
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
  static GoogleAuthenticator provideGoogleAuthenticator() {
    return new GoogleAuthenticator();
  }
}
