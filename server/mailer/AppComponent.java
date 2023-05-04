package keyring.server.mailer;

import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;
import keyring.server.mailer.templates.TemplatesModule;

@Component(modules = {AppModule.class, TemplatesModule.class})
@Singleton
interface AppComponent {
  MessageConsumer messageConsumer();

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder environment(Environment environment);

    AppComponent build();
  }
}
