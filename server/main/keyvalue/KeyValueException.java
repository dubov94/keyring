package keyring.server.main.keyvalue;

public class KeyValueException extends RuntimeException {
  public KeyValueException(String cause) {
    super(cause);
  }

  public KeyValueException(Exception cause) {
    super(cause);
  }
}
