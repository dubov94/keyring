package server.main.templates;

import dagger.Module;
import dagger.Provides;
import org.jtwig.JtwigTemplate;

import javax.inject.Singleton;

@Module
public class TemplatesModule {
  @Provides
  @Singleton
  static MailVerificationCodeHeadRendererFactory provideMailVerificationCodeHeadRendererFactory() {
    JtwigTemplate template = JtwigTemplate.classpathTemplate("/templates/mail_verification_code.head.twig");
    return new MailVerificationCodeHeadRendererFactory(template);
  }

  @Provides
  @Singleton
  static MailVerificationCodeBodyRendererFactory provideMailVerificationCodeBodyRendererFactory() {
    JtwigTemplate template = JtwigTemplate.classpathTemplate("/templates/mail_verification_code.body.twig");
    return new MailVerificationCodeBodyRendererFactory(template);
  }
}
