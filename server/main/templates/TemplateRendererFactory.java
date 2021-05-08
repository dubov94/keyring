package server.main.templates;

interface TemplateRendererFactory {
  TemplateRenderer newRenderer();

  interface TemplateRenderer {
    String render();
  }
}
