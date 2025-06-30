package keyring.server.mailer.templates;

import dagger.Module;
import dagger.Provides;
import io.pebbletemplates.pebble.PebbleEngine;
import io.pebbletemplates.pebble.loader.ClasspathLoader;
import io.pebbletemplates.pebble.template.PebbleTemplate;
import javax.inject.Named;
import javax.inject.Singleton;

@Module
public class TemplatesModule {
  @Provides
  @Singleton
  static PebbleEngine providePebbleEngine() {
    ClasspathLoader loader = new ClasspathLoader();
    loader.setPrefix("templates");
    return new PebbleEngine.Builder().loader(loader).build();
  }

  @Provides
  @Named("mail_vc_head")
  @Singleton
  static PebbleTemplate provideMailVcHeadTemplate(PebbleEngine engine) {
    return engine.getTemplate("mail_vc_head.text.pebble");
  }

  @Provides
  @Named("mail_vc_body")
  @Singleton
  static PebbleTemplate provideMailVcBodyTemplate(PebbleEngine engine) {
    return engine.getTemplate("mail_vc_body.md.pebble");
  }

  @Provides
  @Named("uncompleted_authn_head")
  @Singleton
  static PebbleTemplate provideUncompletedAuthnHeadTemplate(PebbleEngine engine) {
    return engine.getTemplate("uncompleted_authn_head.text.pebble");
  }

  @Provides
  @Named("uncompleted_authn_body")
  @Singleton
  static PebbleTemplate provideUncompletedAuthnBodyTemplate(PebbleEngine engine) {
    return engine.getTemplate("uncompleted_authn_body.md.pebble");
  }

  @Provides
  @Named("deactivation_notice_head")
  @Singleton
  static PebbleTemplate provideDeactivationNoticeHeadTemplate(PebbleEngine engine) {
    return engine.getTemplate("deactivation_notice_head.text.pebble");
  }

  @Provides
  @Named("deactivation_notice_body")
  @Singleton
  static PebbleTemplate provideDeactivationNoticeBodyTemplate(PebbleEngine engine) {
    return engine.getTemplate("deactivation_notice_body.md.pebble");
  }
}
