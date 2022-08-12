package server.main.entities;

import com.google.common.base.Preconditions;
import java.sql.Timestamp;
import javax.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "mail_tokens",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"user_identifier", "code"})})
public class MailToken {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column(columnDefinition = "text")
  private String code;

  @Column(columnDefinition = "text")
  private String mail;

  public long getIdentifier() {
    return identifier;
  }

  public MailToken setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public Timestamp getTimestamp() {
    return timestamp;
  }

  public User getUser() {
    return user;
  }

  public MailToken setUser(User user) {
    this.user = user;
    return this;
  }

  public String getCode() {
    return code;
  }

  public MailToken setCode(String code) {
    Preconditions.checkArgument(code.length() <= 16);
    this.code = code;
    return this;
  }

  public String getMail() {
    return mail;
  }

  public MailToken setMail(String mail) {
    Validators.checkMailLength(mail);
    this.mail = mail;
    return this;
  }
}
