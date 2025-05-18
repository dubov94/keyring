package keyring.server.mailer.templates;

import dagger.Module;
import dagger.Provides;
import javax.inject.Named;
import javax.inject.Singleton;
import org.jtwig.JtwigTemplate;

@Module
public class TemplatesModule {
  @Provides
  @Named("mail_vc_head")
  @Singleton
  static JtwigTemplate provideMailVcHeadTemplate() {
    return JtwigTemplate.classpathTemplate("/templates/mail_vc_head.text.twig");
  }

  @Provides
  @Named("mail_vc_body")
  @Singleton
  static JtwigTemplate provideMailVcBodyTemplate() {
    return JtwigTemplate.classpathTemplate("/templates/mail_vc_body.md.twig");
  }

  @Provides
  @Named("uncompleted_authn_head")
  @Singleton
  static JtwigTemplate provideUncompletedAuthnHeadTemplate() {
    return JtwigTemplate.classpathTemplate("/templates/uncompleted_authn_head.text.twig");
  }

  @Provides
  @Named("uncompleted_authn_body")
  @Singleton
  static JtwigTemplate provideUncompletedAuthnBodyTemplate() {
    return JtwigTemplate.classpathTemplate("/templates/uncompleted_authn_body.md.twig");
  }

  @Provides
  @Named("deactivation_notice_head")
  @Singleton
  static JtwigTemplate provideDeactivationNoticeHeadTemplate() {
    return JtwigTemplate.classpathTemplate("/templates/deactivation_notice_head.text.twig");
  }

  @Provides
  @Named("deactivation_notice_body")
  @Singleton
  static JtwigTemplate provideDeactivationNoticeBodyTemplate() {
    return JtwigTemplate.classpathTemplate("/templates/deactivation_notice_body.md.twig");
  }
}
