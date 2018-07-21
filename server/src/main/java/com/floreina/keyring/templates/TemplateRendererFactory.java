package com.floreina.keyring.templates;

interface TemplateRendererFactory {
  TemplateRenderer newRenderer();

  interface TemplateRenderer {
    String render();
  }
}
