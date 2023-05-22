package keyring.server.mailer.templates;

import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

public class UncompletedAuthnHeadRendererFactory implements TemplateRendererFactory {
  private final JtwigTemplate template;

  UncompletedAuthnHeadRendererFactory(JtwigTemplate template) {
    this.template = template;
  }

  public UncompletedAuthnHeadRenderer newRenderer() {
    return new UncompletedAuthnHeadRenderer();
  }

  public class UncompletedAuthnHeadRenderer implements TemplateRenderer {
    private final JtwigModel model;

    UncompletedAuthnHeadRenderer() {
      this.model = JtwigModel.newModel();
    }

    public String render() {
      return template.render(model);
    }
  }
}
