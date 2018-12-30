package com.floreina.keyring.entities;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "keys")
public class Key {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column private String value;

  @OneToMany(
    mappedBy = "key",
    fetch = FetchType.EAGER,
    cascade = CascadeType.ALL,
    orphanRemoval = true
  )
  @OnDelete(action = OnDeleteAction.CASCADE)
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

  public Key setTags(List<Tag> tags) {
    if (this.tags == null) {
      this.tags = new ArrayList<>();
    } else {
      this.tags.clear();
    }
    tags.forEach(tag -> this.tags.add(tag.setKey(this)));
    return this;
  }
}
