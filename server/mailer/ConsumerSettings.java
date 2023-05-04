package keyring.server.mailer;

import org.apache.commons.lang3.time.DateUtils;

class ConsumerSettings {
  static final long K8S_GRACE_PERIOD_MILLIS = 30 * DateUtils.MILLIS_PER_SECOND;
  static final int MAX_MESSAGES_PER_READ = 16;
}
