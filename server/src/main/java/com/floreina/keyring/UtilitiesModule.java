package com.floreina.keyring;

import com.floreina.keyring.interceptors.RecognitionInterceptor;
import com.floreina.keyring.interceptors.RecognitionKeys;
import com.floreina.keyring.interceptors.SessionKeys;
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
  static RecognitionInterceptor provideRecognitionInterceptor() {
    return new RecognitionInterceptor();
  }

  @Provides
  @Singleton
  static RecognitionKeys provideRecognitionKeys() {
    return new RecognitionKeys();
  }
}
