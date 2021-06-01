package server.main.entities;

import java.sql.Timestamp;
import java.time.Instant;
import javax.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @Version private long version;

  @Enumerated private State state;

  // Note that currently there are no server-side limitations.
  @Column(unique = true)
  private String username;

  @Column private String salt;

  @Column private String hash;

  @Column(name = "otp_shared_secret")
  private String otpSharedSecret;

  @Column private String mail;

  @Column(name = "last_session")
  private Timestamp lastSession;

  public long getIdentifier() {
    return identifier;
  }

  public User setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public State getState() {
    return state;
  }

  public User setState(State state) {
    this.state = state;
    return this;
  }

  public String getUsername() {
    return username;
  }

  public User setUsername(String username) {
    this.username = username;
    return this;
  }

  public String getSalt() {
    return salt;
  }

  public User setSalt(String salt) {
    this.salt = salt;
    return this;
  }

  public String getHash() {
    return hash;
  }

  public User setHash(String hash) {
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

  public String getMail() {
    return mail;
  }

  public User setMail(String mail) {
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

  public enum State {
    PENDING,
    ACTIVE,
    DELETED
  }
}
