package keyring.server.main.entities;

import com.google.common.base.Preconditions;
import java.sql.Timestamp;
import java.time.Instant;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Version;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "mail_tokens",
    indexes = {@Index(columnList = "user_identifier"), @Index(columnList = "mail")})
public class MailToken {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @Version private long version;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column(columnDefinition = "text")
  private String code;

  @Column(columnDefinition = "text")
  private String mail;

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
