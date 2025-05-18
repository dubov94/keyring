package keyring.server.mailer;

import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.jtwig.JtwigModel;
import org.jtwig.JtwigTemplate;

class TemplatedMailClient implements MailClient  {
  private MailService mailService;
  private JtwigTemplate mailVcHeadTemplate;
  private JtwigTemplate mailVcBodyTemplate;
  private JtwigTemplate uncompletedAuthnHeadTemplate;
  private JtwigTemplate uncompletedAuthnBodyTemplate;

  TemplatedMailClient(
      MailService mailService,
      JtwigTemplate mailVcHeadTemplate,
      JtwigTemplate mailVcBodyTemplate,
      JtwigTemplate uncompletedAuthnHeadTemplate,
      JtwigTemplate uncompletedAuthnBodyTemplate) {
    this.mailService = mailService;
    this.mailVcHeadTemplate = mailVcHeadTemplate;
    this.mailVcBodyTemplate = mailVcBodyTemplate;
    this.uncompletedAuthnHeadTemplate = uncompletedAuthnHeadTemplate;
    this.uncompletedAuthnBodyTemplate = uncompletedAuthnBodyTemplate;
  }

  private String convertMarkdownToHtml(String markdown) {
    Parser parser = Parser.builder().build();
    Node document = parser.parse(markdown);
    HtmlRenderer renderer = HtmlRenderer.builder().build();
    return renderer.render(document);
  }

  @Override
  public void sendMailVc(String to, String username, String code) {
    String head = mailVcHeadTemplate.render(JtwigModel.newModel().with("code", code));
    String body =
        convertMarkdownToHtml(
            mailVcBodyTemplate.render(
                JtwigModel.newModel().with("username", username).with("code", code)));
    this.mailService.send(to, head, body);
  }

  @Override
  public void sendUncompletedAuthn(String to, String username, String ipAddress) {
    String head = uncompletedAuthnHeadTemplate.render(JtwigModel.newModel());
    String body =
        convertMarkdownToHtml(
            uncompletedAuthnBodyTemplate.render(
                JtwigModel.newModel().with("username", username).with("ipAddress", ipAddress)));
    this.mailService.send(to, head, body);
  }
}
