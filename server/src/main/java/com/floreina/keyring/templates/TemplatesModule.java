package com.floreina.keyring.templates;

import dagger.Module;
import dagger.Provides;
import org.jtwig.JtwigTemplate;

import javax.inject.Singleton;

@Module
public class TemplatesModule {
  @Provides
  @Singleton
  static CodeHeadRendererFactory provideCodeHeadRendererFactory() {
    JtwigTemplate template = JtwigTemplate.classpathTemplate("/templates/code.head.twig");
    return new CodeHeadRendererFactory(template);
  }

  @Provides
  @Singleton
  static CodeBodyRendererFactory provideCodeBodyRendererFactory() {
    JtwigTemplate template = JtwigTemplate.classpathTemplate("/templates/code.body.twig");
    return new CodeBodyRendererFactory(template);
  }
}
