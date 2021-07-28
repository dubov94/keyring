package server.main.entities;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "sessions")
public class Session {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @CreationTimestamp private Timestamp timestamp;

  // Not unique as it's theoretically possible to have two equal expired keys.
  @Column private String key;

  @Column(name = "ip_address")
  private String ipAddress;

  @Column(name = "user_agent")
  private String userAgent;

  @Column(name = "client_version")
  private String clientVersion;

  public Session setUser(User user) {
    this.user = user;
    return this;
  }

  public Timestamp getTimestamp() {
    return timestamp;
  }

  public Session setTimestamp(Timestamp timestamp) {
    this.timestamp = timestamp;
    return this;
  }

  public String getKey() {
    return key;
  }

  public Session setKey(String key) {
    this.key = key;
    return this;
  }

  public String getIpAddress() {
    return ipAddress;
  }

  public Session setIpAddress(String ipAddress) {
    this.ipAddress = ipAddress;
    return this;
  }

  public String getUserAgent() {
    return userAgent;
  }

  public Session setUserAgent(String userAgent) {
    this.userAgent = userAgent;
    return this;
  }

  public String getClientVersion() {
    return clientVersion;
  }

  public Session setClientVersion(String clientVersion) {
    this.clientVersion = clientVersion;
    return this;
  }
}
