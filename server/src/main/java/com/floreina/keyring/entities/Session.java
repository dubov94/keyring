package com.floreina.keyring.entities;

import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.sql.Timestamp;

// TODO: Migrate to Redis.
@Entity
@Table(name = "keyvalue")
public class Session {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @ManyToOne private User user;

  @CreationTimestamp private Timestamp timestamp;

  // Not unique as it's theoretically possible to have two equal expired keys.
  @Column private String key;

  @Column(name = "ip_address")
  private String ipAddress;

  @Column(name = "user_agent")
  private String userAgent;

  public Session setUser(User user) {
    this.user = user;
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
}
