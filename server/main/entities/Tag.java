package server.main.entities;

import javax.persistence.*;

@Entity
@Table(name = "tags")
public class Tag {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @ManyToOne @JoinColumn private Key key;

  @Column private String value;

  public Tag setKey(Key key) {
    this.key = key;
    return this;
  }

  public String getValue() {
    return value;
  }

  public Tag setValue(String value) {
    this.value = value;
    return this;
  }
}
