package keyring.server.main.entities;

import java.sql.Timestamp;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "otp_tokens",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"user_identifier", "value"})})
public class OtpToken {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @CreationTimestamp
  @Column(name = "creation_timestamp")
  private Timestamp creationTimestamp;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column(name = "is_initial")
  private boolean isInitial;

  @Column(columnDefinition = "text")
  private String value;

  public long getId() {
    return id;
  }

  public OtpToken setId(long id) {
    this.id = id;
    return this;
  }

  public User getUser() {
    return user;
  }

  public OtpToken setUser(User user) {
    this.user = user;
    return this;
  }

  public String getValue() {
    return value;
  }

  public OtpToken setValue(String value) {
    this.value = value;
    return this;
  }

  public boolean getIsInitial() {
    return isInitial;
  }

  public OtpToken setIsInitial(boolean isInitial) {
    this.isInitial = isInitial;
    return this;
  }
}
