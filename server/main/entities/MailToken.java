package keyring.server.main.entities;

import com.google.common.base.Preconditions;
import java.sql.Timestamp;
import java.time.Instant;
import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Version;
import keyring.server.main.entities.columns.MailTokenState;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "mail_tokens",
    indexes = {@Index(columnList = "user_identifier"), @Index(columnList = "ip_address")})
public class MailToken {
  public static final long MAIL_TOKEN_EXPIRATION_H = 1;
  public static final long APPROX_MAX_MAIL_TOKENS_PER_USER = 4;
  public static final long APPROX_MAX_MAIL_TOKENS_PER_IP_ADDRESS = 64;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @Version private long version;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column(name = "ip_address", columnDefinition = "text")
  private String ipAddress;

  @Column(columnDefinition = "text")
  private String code;

  @Column(columnDefinition = "text")
  private String mail;

  @Convert(converter = MailTokenStateConverter.class)
  private MailTokenState state;

  @Column(name = "last_attempt")
  @ColumnDefault("timestamp 'epoch'")
  private Timestamp lastAttempt = Timestamp.from(Instant.EPOCH);

  @Column(name = "attempt_count")
  @ColumnDefault("0")
  private int attemptCount = 0;

  public long getIdentifier() {
    return identifier;
  }

  public MailToken setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public Timestamp getTimestamp() {
    return timestamp;
  }

  public User getUser() {
    return user;
  }

  public MailToken setUser(User user) {
    this.user = user;
    return this;
  }

  public MailToken setIpAddress(String ipAddress) {
    // https://stackoverflow.com/q/166132
    Preconditions.checkArgument(ipAddress.length() <= 64);
    this.ipAddress = ipAddress;
    return this;
  }

  public String getCode() {
    return code;
  }

  public MailToken setCode(String code) {
    Preconditions.checkArgument(code.length() <= 16);
    this.code = code;
    return this;
  }

  public String getMail() {
    return mail;
  }

  public MailToken setMail(String mail) {
    Validators.checkMailLength(mail);
    this.mail = mail;
    return this;
  }

  public MailTokenState getState() {
    return state;
  }

  public MailToken setState(MailTokenState state) {
    this.state = state;
    return this;
  }

  public Instant getLastAttempt() {
    return lastAttempt.toInstant();
  }

  public MailToken setLastAttempt(Instant instant) {
    lastAttempt = Timestamp.from(instant);
    return this;
  }

  public int getAttemptCount() {
    return attemptCount;
  }

  public MailToken setAttemptCount(int attemptCount) {
    this.attemptCount = attemptCount;
    return this;
  }

  public void incrementAttemptCount() {
    attemptCount += 1;
  }
}
