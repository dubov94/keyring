package keyring.server.main.entities;

import com.google.common.base.Preconditions;
import java.sql.Timestamp;
import java.time.Instant;
import javax.persistence.*;
import keyring.server.main.entities.columns.UserState;
import org.apache.commons.io.FileUtils;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
public class User {
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

  @Column(name = "last_session")
  private Timestamp lastSession;

  public long getIdentifier() {
    return identifier;
  }

  public User setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
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
      throw new IllegalStateException();
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
