package com.floreina.keyring.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class CodeBodyRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  CodeBodyRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public CodeBodyRenderer newRenderer() {
    return new CodeBodyRenderer();
  }

  public class CodeBodyRenderer implements TemplateRenderer {
    private final JtwigModel model;

    CodeBodyRenderer() {
      this.model = new JtwigModel();
    }

    public CodeBodyRenderer setCode(String code) {
      model.with("code", code);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
