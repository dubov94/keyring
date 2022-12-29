package keyring.server.main.aspects;

import org.aspectj.bridge.AbortException;
import org.aspectj.bridge.IMessage;
import org.aspectj.bridge.IMessage.Kind;
import org.aspectj.bridge.IMessageHandler;

public class MessageHandler implements IMessageHandler {
  public boolean handleMessage(IMessage message) {
    Kind kind = message.getKind();
    if (kind.compareTo(IMessage.ERROR) >= 0) {
      throw new AbortException(message);
    } else if (kind.compareTo(IMessage.DEBUG) > 0) {
      return IMessageHandler.SYSTEM_OUT.handleMessage(message);
    }
    return false;
  }

  public boolean isIgnoring(IMessage.Kind kind) {
    return kind.compareTo(IMessage.DEBUG) <= 0;
  }

  public void dontIgnore(IMessage.Kind kind) {}

  public void ignore(IMessage.Kind kind) {}
}
