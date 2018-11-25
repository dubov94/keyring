package com.floreina.keyring.entities;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "keys")
public class Key {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @ManyToOne private User user;

  @Column private String value;

  @OneToMany(fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
  private List<Tag> tags;

  public long getIdentifier() {
    return identifier;
  }

  public User getUser() {
    return user;
  }

  public Key setUser(User user) {
    this.user = user;
    return this;
  }

  public String getValue() {
    return value;
  }

  public Key setValue(String value) {
    this.value = value;
    return this;
  }

  public List<Tag> getTags() {
    return tags;
  }

  Key setTags(List<Tag> tags) {
    if (this.tags == null) {
      this.tags = new ArrayList<>();
    } else {
      this.tags.clear();
    }
    this.tags.addAll(tags);
    return this;
  }
}
