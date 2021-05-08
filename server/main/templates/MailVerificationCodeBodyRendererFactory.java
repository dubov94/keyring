package server.main.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class MailVerificationCodeBodyRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  MailVerificationCodeBodyRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public MailVerificationCodeBodyRenderer newRenderer() {
    return new MailVerificationCodeBodyRenderer();
  }

  public class MailVerificationCodeBodyRenderer implements TemplateRenderer {
    private final JtwigModel model;

    MailVerificationCodeBodyRenderer() {
      this.model = new JtwigModel();
    }

    public MailVerificationCodeBodyRenderer setCode(String code) {
      model.with("code", code);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
