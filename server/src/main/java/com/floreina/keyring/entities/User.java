package com.floreina.keyring.entities;

import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User {
  @Id @GeneratedValue private long identifier;

  @CreationTimestamp private java.sql.Timestamp timestamp;

  @Enumerated private State state;

  @Column(unique = true)
  private String username;

  @Column private String salt;

  @Column private String digest;

  @Column private String mail;

  @OneToMany private List<Key> keys;

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

  public String getDigest() {
    return digest;
  }

  public User setDigest(String digest) {
    this.digest = digest;
    return this;
  }

  public String getMail() {
    return mail;
  }

  public User setMail(String mail) {
    this.mail = mail;
    return this;
  }

  public enum State {
    PENDING,
    ACTIVE
  }
}
