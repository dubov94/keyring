package server.main.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class MailVcHeadRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  MailVcHeadRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public MailVcHeadRenderer newRenderer() {
    return new MailVcHeadRenderer();
  }

  public class MailVcHeadRenderer implements TemplateRenderer {
    private final JtwigModel model;

    MailVcHeadRenderer() {
      this.model = new JtwigModel();
    }

    public MailVcHeadRenderer setCode(String code) {
      model.with("code", code);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
