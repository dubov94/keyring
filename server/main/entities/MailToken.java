package server.main.entities;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(
  name = "mail_tokens",
  uniqueConstraints = {@UniqueConstraint(columnNames = {"user_identifier", "code"})}
)
public class MailToken {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column private String code;

  @Column private String mail;

  public long getIdentifier() {
    return identifier;
  }

  public MailToken setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
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
    this.code = code;
    return this;
  }

  public String getMail() {
    return mail;
  }

  public MailToken setMail(String mail) {
    this.mail = mail;
    return this;
  }
}
