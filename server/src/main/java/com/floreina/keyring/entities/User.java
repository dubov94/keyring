package com.floreina.keyring.entities;

import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @Enumerated private State state;

  // Note that currently there are no server-side limitations.
  @Column(unique = true)
  private String username;

  @Column private String salt;

  @Column private String hash;

  @Column private String mail;

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

  public String getMail() {
    return mail;
  }

  public User setMail(String mail) {
    this.mail = mail;
    return this;
  }

  public enum State {
    PENDING,
    ACTIVE,
    DELETED
  }
}
