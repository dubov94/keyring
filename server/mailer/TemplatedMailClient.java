package keyring.server.mailer;

import com.google.common.collect.ImmutableMap;
import io.pebbletemplates.pebble.template.PebbleTemplate;
import java.io.IOException;
import java.io.StringWriter;
import java.util.Map;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;

class TemplatedMailClient implements MailClient {
  private MailService mailService;
  private PebbleTemplate mailVcHeadTemplate;
  private PebbleTemplate mailVcBodyTemplate;
  private PebbleTemplate uncompletedAuthnHeadTemplate;
  private PebbleTemplate uncompletedAuthnBodyTemplate;
  private PebbleTemplate deactivationNoticeHeadTemplate;
  private PebbleTemplate deactivationNoticeBodyTemplate;

  TemplatedMailClient(
      MailService mailService,
      PebbleTemplate mailVcHeadTemplate,
      PebbleTemplate mailVcBodyTemplate,
      PebbleTemplate uncompletedAuthnHeadTemplate,
      PebbleTemplate uncompletedAuthnBodyTemplate,
      PebbleTemplate deactivationNoticeHeadTemplate,
      PebbleTemplate deactivationNoticeBodyTemplate) {
    this.mailService = mailService;
    this.mailVcHeadTemplate = mailVcHeadTemplate;
    this.mailVcBodyTemplate = mailVcBodyTemplate;
    this.uncompletedAuthnHeadTemplate = uncompletedAuthnHeadTemplate;
    this.uncompletedAuthnBodyTemplate = uncompletedAuthnBodyTemplate;
    this.deactivationNoticeHeadTemplate = deactivationNoticeHeadTemplate;
    this.deactivationNoticeBodyTemplate = deactivationNoticeBodyTemplate;
  }

  private String convertMarkdownToHtml(String markdown) {
    Parser parser = Parser.builder().build();
    Node document = parser.parse(markdown);
    HtmlRenderer renderer = HtmlRenderer.builder().build();
    return renderer.render(document);
  }

  private String renderTemplate(PebbleTemplate template, Map<String, Object> context) {
    StringWriter writer = new StringWriter();
    try {
      template.evaluate(writer, context);
    } catch (IOException exception) {
      throw new RuntimeException(exception);
    }
    return writer.toString();
  }

  @Override
  public void sendMailVc(String to, String username, String code) {
    String head = renderTemplate(mailVcHeadTemplate, ImmutableMap.of("code", code));
    String body =
        convertMarkdownToHtml(
            renderTemplate(
                mailVcBodyTemplate, ImmutableMap.of("username", username, "code", code)));

    this.mailService.send(to, head, body);
  }

  @Override
  public void sendUncompletedAuthn(String to, String username, String ipAddress) {
    String head = renderTemplate(uncompletedAuthnHeadTemplate, ImmutableMap.of());
    String body =
        convertMarkdownToHtml(
            renderTemplate(
                uncompletedAuthnBodyTemplate,
                ImmutableMap.of("username", username, "ipAddress", ipAddress)));
    this.mailService.send(to, head, body);
  }

  @Override
  public void sendDeactivationNotice(
      String to, String username, int inactivityPeriodYears, int daysLeft) {
    String head = renderTemplate(deactivationNoticeHeadTemplate, ImmutableMap.of());
    String body =
        convertMarkdownToHtml(
            renderTemplate(
                deactivationNoticeBodyTemplate,
                ImmutableMap.of(
                    "username",
                    username,
                    "inactivityPeriodYears",
                    inactivityPeriodYears,
                    "daysLeft",
                    daysLeft)));
    this.mailService.send(to, head, body);
  }
}
