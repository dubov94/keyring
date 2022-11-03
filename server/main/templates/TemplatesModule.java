package server.main.templates;

import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import org.jtwig.JtwigTemplate;

@Module
public class TemplatesModule {
  @Provides
  @Singleton
  static MailVcHeadRendererFactory provideMailVcHeadRendererFactory() {
    JtwigTemplate template =
        JtwigTemplate.classpathTemplate("/templates/mail_verification_code.head.twig");
    return new MailVcHeadRendererFactory(template);
  }

  @Provides
  @Singleton
  static MailVcBodyRendererFactory provideMailVcBodyRendererFactory() {
    JtwigTemplate template =
        JtwigTemplate.classpathTemplate("/templates/mail_verification_code.body.twig");
    return new MailVcBodyRendererFactory(template);
  }
}
