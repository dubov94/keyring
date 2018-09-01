package com.floreina.keyring.entities;

import javax.persistence.*;

@Entity
@Table(name = "tags")
public class Tag {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @Column private String value;

  public String getValue() {
    return value;
  }

  public Tag setValue(String value) {
    this.value = value;
    return this;
  }
}
