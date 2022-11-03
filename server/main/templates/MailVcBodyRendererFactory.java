package server.main.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class MailVcBodyRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  MailVcBodyRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public MailVcBodyRenderer newRenderer() {
    return new MailVcBodyRenderer();
  }

  public class MailVcBodyRenderer implements TemplateRenderer {
    private final JtwigModel model;

    MailVcBodyRenderer() {
      this.model = new JtwigModel();
    }

    public MailVcBodyRenderer setCode(String code) {
      model.with("code", code);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
