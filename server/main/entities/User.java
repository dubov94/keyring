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
import javax.persistence.Table;
import javax.persistence.Version;
import keyring.server.main.entities.columns.UserState;
import org.apache.commons.io.FileUtils;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
public class User {
  public static final long PENDING_USER_EXPIRATION_M = 15;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @Version private long version;

  @Convert(converter = UserStateConverter.class)
  private UserState state;

  @Column(columnDefinition = "text", unique = true)
  private String username;

  @Column(columnDefinition = "text")
  private String salt;

  @Column(columnDefinition = "text")
  private String hash;

  @Column(name = "otp_shared_secret", columnDefinition = "text")
  private String otpSharedSecret;

  @Column(name = "otp_spare_attempts")
  @ColumnDefault("0")
  private int otpSpareAttempts = 0;

  @Column(columnDefinition = "text")
  private String mail;

  // Latest stage change to `ACTIVATED`.
  @Column(name = "last_session")
  private Timestamp lastSession;

  public long getIdentifier() {
    return identifier;
  }

  public User setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public long getVersion() {
    return version;
  }

  public UserState getState() {
    return state;
  }

  public User setState(UserState state) {
    this.state = state;
    return this;
  }

  public String getUsername() {
    return username;
  }

  public User setUsername(String username) {
    Preconditions.checkArgument(username.length() <= 256);
    this.username = username;
    return this;
  }

  public String getSalt() {
    return salt;
  }

  public User setSalt(String salt) {
    Validators.checkStringSize(FileUtils.ONE_KB, salt);
    this.salt = salt;
    return this;
  }

  public String getHash() {
    return hash;
  }

  public User setHash(String hash) {
    Validators.checkStringSize(FileUtils.ONE_KB, hash);
    this.hash = hash;
    return this;
  }

  public String getOtpSharedSecret() {
    return otpSharedSecret;
  }

  public User setOtpSharedSecret(String otpSharedSecret) {
    this.otpSharedSecret = otpSharedSecret;
    return this;
  }

  public int getOtpSpareAttempts() {
    return otpSpareAttempts;
  }

  public User setOtpSpareAttempts(int otpSpareAttempts) {
    this.otpSpareAttempts = otpSpareAttempts;
    return this;
  }

  public void decrementOtpSpareAttempts() {
    if (otpSpareAttempts == 0) {
      throw new IllegalStateException(String.format("User %d has no spare attempts", identifier));
    }
    otpSpareAttempts -= 1;
  }

  public String getMail() {
    return mail;
  }

  public User setMail(String mail) {
    Validators.checkMailLength(mail);
    this.mail = mail;
    return this;
  }

  public Instant getLastSession() {
    return lastSession.toInstant();
  }

  public User setLastSession(Instant instant) {
    this.lastSession = Timestamp.from(instant);
    return this;
  }

  public boolean isActivated() {
    return getMail() != null;
  }
}
