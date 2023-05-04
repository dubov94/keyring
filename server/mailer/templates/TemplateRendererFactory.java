package keyring.server.mailer.templates;

interface TemplateRendererFactory {
  TemplateRenderer newRenderer();

  interface TemplateRenderer {
    String render();
  }
}
