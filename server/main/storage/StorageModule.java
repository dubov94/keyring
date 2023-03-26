package keyring.server.main.storage;

import com.google.common.collect.ImmutableMap;
import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import keyring.server.main.Chronometry;
import keyring.server.main.Environment;
import keyring.server.main.entities.Key;
import keyring.server.main.entities.MailToken;
import keyring.server.main.entities.OtpParams;
import keyring.server.main.entities.Session;

@Module
public class StorageModule {
  @Provides
  @Singleton
  static EntityManagerFactory provideEntityManagerFactory(Environment environment) {
    if (environment.isProduction()) {
      return Persistence.createEntityManagerFactory(
          "production",
          ImmutableMap.of("javax.persistence.jdbc.password", environment.getPostgresPassword()));
    }
    return Persistence.createEntityManagerFactory(
        "development", ImmutableMap.of("hibernate.hbm2ddl.auto", "create"));
  }

  @Provides
  @Singleton
  static Limiters provideLimiters() {
    return new Limiters(
        Key.APPROX_MAX_KEYS_PER_USER,
        MailToken.APPROX_MAX_MAIL_TOKENS_PER_USER,
        MailToken.APPROX_MAX_MAIL_TOKENS_PER_IP_ADDRESS,
        Session.APPROX_MAX_LAST_HOUR_SESSIONS_PER_USER,
        OtpParams.APPROX_MAX_OTP_PARAMS_PER_USER);
  }

  @Provides
  static AccountOperationsInterface provideAccountOperationsInterface(
      Chronometry chronometry, Limiters limiters) {
    return new AccountOperationsClient(chronometry, limiters, /* initialSpareAttempts */ 5);
  }

  @Provides
  static KeyOperationsInterface provideKeyOperationsInterface(Limiters limiters) {
    return new KeyOperationsClient(limiters);
  }
}
