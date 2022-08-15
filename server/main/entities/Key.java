package server.main.entities;

import com.google.common.collect.ImmutableList;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import javax.persistence.*;
import org.apache.commons.io.FileUtils;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;
import server.main.proto.service.KeyAttrs;
import server.main.proto.service.KeyProto;
import server.main.proto.service.Password;

@Entity
@Table(name = "keys")
@TypeDef(name = "string-array", typeClass = StringArrayType.class)
public class Key {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @Column(name = "creation_timestamp")
  @CreationTimestamp
  private Timestamp creationTimestamp;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Version private long version;

  @Column(columnDefinition = "text")
  private String value;

  @Type(type = "string-array")
  @Column(columnDefinition = "text[]")
  private String[] labels;

  @Column(name = "is_shadow")
  @ColumnDefault("false")
  private boolean isShadow = false;

  @ManyToOne(fetch = FetchType.LAZY)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Key parent;

  public long getIdentifier() {
    return identifier;
  }

  public Optional<Timestamp> getCreationTimestamp() {
    return Optional.ofNullable(creationTimestamp);
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
    Validators.checkStringSize(4 * FileUtils.ONE_KB, value);
    this.value = value;
    return this;
  }

  public List<String> getTags() {
    return Optional.ofNullable(labels)
        .map((array) -> Arrays.asList(array))
        .orElseGet(() -> ImmutableList.of());
  }

  public Key setTags(List<String> tags) {
    tags.forEach((tag) -> Validators.checkStringSize(FileUtils.ONE_KB, tag));
    this.labels = tags.stream().toArray(String[]::new);
    return this;
  }

  public boolean getIsShadow() {
    return isShadow;
  }

  public Key setIsShadow(boolean isShadow) {
    this.isShadow = isShadow;
    return this;
  }

  public Key getParent() {
    return parent;
  }

  public Key setParent(Key parent) {
    this.parent = parent;
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

  public KeyProto toKeyProto() {
    KeyProto.Builder builder = KeyProto.newBuilder();
    builder.setIdentifier(getIdentifier());
    getCreationTimestamp()
        .ifPresent(
            (timestamp) -> {
              builder.setCreationTimeInMillis(timestamp.getTime());
            });
    builder.setPassword(toPassword());
    builder.setAttrs(
        KeyAttrs.newBuilder()
            .setIsShadow(getIsShadow())
            .setParent(Optional.ofNullable(getParent()).map(Key::getIdentifier).orElse(0L)));
    return builder.build();
  }
}
