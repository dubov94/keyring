package server.main.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class MailVerificationCodeHeadRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  MailVerificationCodeHeadRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public MailVerificationCodeHeadRenderer newRenderer() {
    return new MailVerificationCodeHeadRenderer();
  }

  public class MailVerificationCodeHeadRenderer implements TemplateRenderer {
    private final JtwigModel model;

    MailVerificationCodeHeadRenderer() {
      this.model = new JtwigModel();
    }

    public MailVerificationCodeHeadRenderer setCode(String code) {
      model.with("code", code);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
