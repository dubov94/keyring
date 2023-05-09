package keyring.server.main.entities;

import com.google.common.base.CharMatcher;
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
import keyring.server.main.entities.columns.SessionStage;
import org.apache.commons.io.FileUtils;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "sessions",
    indexes = {@Index(columnList = "user_identifier")})
public class Session {
  public static final int SESSION_AUTHN_EXPIRATION_M = 5;
  // if_change
  // Maximum allowed idle time between two requests.
  public static final int SESSION_RELATIVE_DURATION_M = 10;
  // then_change(pwa/src/redux/index.js:session_relative_duration)
  public static final int SESSION_ABSOLUTE_DURATION_H = 2;
  public static final long SESSION_STORAGE_EVICTION_D = 28;
  public static final long APPROX_MAX_LAST_HOUR_SESSIONS_PER_USER = 60 / 4;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @Version private long version;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @CreationTimestamp private Timestamp timestamp;

  @Column(name = "last_stage_change")
  private Timestamp lastStageChange;

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

  public Instant getLastStageChange() {
    return lastStageChange.toInstant();
  }

  public String getKey() {
    return key;
  }

  public Session setKey(String key) {
    Validators.checkStringSize(FileUtils.ONE_KB, key);
    Preconditions.checkArgument(CharMatcher.is(':').countIn(key) == 1);
    this.key = key;
    return this;
  }

  public SessionStage getStage() {
    return stage;
  }

  public Session setStage(SessionStage stage, Instant instant) {
    // if_change
    this.lastStageChange = Timestamp.from(instant);
    this.stage = stage;
    // then_change(server/janitor/tasks/DisabledSessionRecords.java:session_disablement)
    return this;
  }

  public boolean isActivated() {
    return stage == SessionStage.SESSION_ACTIVATED;
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
