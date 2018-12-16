package com.floreina.keyring;

import com.floreina.keyring.interceptors.SessionKeys;
import com.floreina.keyring.interceptors.UserMetadataInterceptor;
import com.floreina.keyring.interceptors.UserMetadataKeys;
import com.google.gson.Gson;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;
import java.security.SecureRandom;

@Module
class UtilitiesModule {
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
  static SessionKeys provideSessionKeys() {
    return new SessionKeys();
  }

  @Provides
  @Singleton
  static UserMetadataInterceptor provideUserMetadataInterceptor() {
    return new UserMetadataInterceptor();
  }

  @Provides
  @Singleton
  static UserMetadataKeys provideUserMetadataKeys() {
    return new UserMetadataKeys();
  }
}
