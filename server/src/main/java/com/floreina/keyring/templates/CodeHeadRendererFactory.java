package com.floreina.keyring.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class CodeHeadRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  CodeHeadRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public CodeHeadRenderer newRenderer() {
    return new CodeHeadRenderer();
  }

  public class CodeHeadRenderer implements TemplateRenderer {
    private final JtwigModel model;

    CodeHeadRenderer() {
      this.model = JtwigModel.newModel();
    }

    public CodeHeadRenderer setCode(String code) {
      model.with("code", code);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
