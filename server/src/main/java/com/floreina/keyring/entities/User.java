package com.floreina.keyring.entities;

import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private java.sql.Timestamp timestamp;

  // Note that currently there are no limitations.
  @Column(unique = true)
  private String username;

  @Column private String salt;

  @Column private String digest;

  @Column private String mail;

  public long getIdentifier() {
    return identifier;
  }

  public User setIdentifier(long identifier) {
    this.identifier = identifier;
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
}
