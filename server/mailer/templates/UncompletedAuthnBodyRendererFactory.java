package keyring.server.mailer.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class UncompletedAuthnBodyRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  UncompletedAuthnBodyRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public UncompletedAuthnBodyRenderer newRenderer() {
    return new UncompletedAuthnBodyRenderer();
  }

  public class UncompletedAuthnBodyRenderer implements TemplateRenderer {
    private final JtwigModel model;

    UncompletedAuthnBodyRenderer() {
      this.model = JtwigModel.newModel();
    }

    public UncompletedAuthnBodyRenderer setIpAddress(String ipAddress) {
      model.with("ipAddress", ipAddress);
      return this;
    }

    public String render() {
      return template.render(model);
    }
  }
}
