package com.floreina.keyring.entities;

import javax.persistence.*;

@Entity
@Table(name = "activations")
public class Activation {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @OneToOne(cascade = CascadeType.PERSIST)
  private User user;

  @Column private String code;

  public User getUser() {
    return user;
  }

  public Activation setUser(User user) {
    this.user = user;
    return this;
  }

  public String getCode() {
    return code;
  }

  public Activation setCode(String code) {
    this.code = code;
    return this;
  }
}
