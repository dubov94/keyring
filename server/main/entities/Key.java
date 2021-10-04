package server.main.entities;

import com.google.common.collect.ImmutableList;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import javax.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;
import server.main.proto.service.IdentifiedKey;
import server.main.proto.service.Password;

@Entity
@Table(name = "keys")
@TypeDef(name = "string-array", typeClass = StringArrayType.class)
public class Key {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Version private long version;

  @Column private String value;

  @Type(type = "string-array")
  @Column(columnDefinition = "text[]")
  private String[] labels;

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

  public List<String> getTags() {
    return Optional.ofNullable(labels)
        .map((array) -> Arrays.asList(array))
        .orElseGet(() -> ImmutableList.of());
  }

  public Key setTags(List<String> tags) {
    this.labels = tags.stream().toArray(String[]::new);
    return this;
  }

  public Key mergeFromPassword(Password password) {
    setValue(password.getValue());
    setTags(password.getTagsList());
    return this;
  }

  public Password toPassword() {
    return Password.newBuilder().setValue(getValue()).addAllTags(getTags()).build();
  }

  public IdentifiedKey toIdentifiedKey() {
    return IdentifiedKey.newBuilder()
        .setPassword(Password.newBuilder().setValue(getValue()).addAllTags(getTags()).build())
        .setIdentifier(getIdentifier())
        .build();
  }
}
