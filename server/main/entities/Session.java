package keyring.server.main.entities;

import com.google.common.base.Preconditions;
import java.sql.Timestamp;
import java.time.Instant;
import javax.persistence.*;
import keyring.server.main.entities.columns.SessionStage;
import org.apache.commons.io.FileUtils;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "sessions")
public class Session {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @Version private long version;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @CreationTimestamp private Timestamp timestamp;

  // Not unique as it's theoretically possible to have two equal expired keys.
  @Column(columnDefinition = "text")
  private String key;

  @Convert(converter = SessionStageConverter.class)
  private SessionStage stage;

  @Column(name = "ip_address", columnDefinition = "text")
  private String ipAddress;

  @Column(name = "user_agent", columnDefinition = "text")
  private String userAgent;

  @Column(name = "client_version", columnDefinition = "text")
  private String clientVersion;

  public long getIdentifier() {
    return identifier;
  }

  public Session setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public User getUser() {
    return user;
  }

  public Session setUser(User user) {
    this.user = user;
    return this;
  }

  public Instant getTimestamp() {
    return timestamp.toInstant();
  }

  public Session setTimestamp(Instant instant) {
    this.timestamp = Timestamp.from(instant);
    return this;
  }

  public String getKey() {
    return key;
  }

  public Session setKey(String key) {
    Validators.checkStringSize(FileUtils.ONE_KB, key);
    this.key = key;
    return this;
  }

  public SessionStage getStage() {
    return stage;
  }

  public Session setStage(SessionStage stage) {
    this.stage = stage;
    return this;
  }

  public String getIpAddress() {
    return ipAddress;
  }

  public Session setIpAddress(String ipAddress) {
    // https://stackoverflow.com/q/166132
    Preconditions.checkArgument(ipAddress.length() <= 64);
    this.ipAddress = ipAddress;
    return this;
  }

  public String getUserAgent() {
    return userAgent;
  }

  public Session setUserAgent(String userAgent) {
    // https://stackoverflow.com/q/654921
    Preconditions.checkArgument(userAgent.length() <= 256);
    this.userAgent = userAgent;
    return this;
  }

  public String getClientVersion() {
    return clientVersion;
  }

  public Session setClientVersion(String clientVersion) {
    Preconditions.checkArgument(clientVersion.length() <= 128);
    this.clientVersion = clientVersion;
    return this;
  }
}
