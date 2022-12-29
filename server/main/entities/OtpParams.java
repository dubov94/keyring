package keyring.server.main.entities;

import com.vladmihalcea.hibernate.type.array.StringArrayType;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@Entity
@Table(
    name = "otp_params",
    indexes = {@Index(columnList = "user_identifier")})
@TypeDef(name = "string-array", typeClass = StringArrayType.class)
public class OtpParams {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @CreationTimestamp
  @Column(name = "creation_timestamp")
  private Timestamp creationTimestamp;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column(name = "shared_secret", columnDefinition = "text")
  private String sharedSecret;

  @Type(type = "string-array")
  @Column(name = "scratch_codes", columnDefinition = "text[]")
  // Not `List` due to https://github.com/vladmihalcea/hibernate-types/issues/137.
  private String[] scratchCodes;

  public long getId() {
    return id;
  }

  public OtpParams setId(long id) {
    this.id = id;
    return this;
  }

  public User getUser() {
    return user;
  }

  public OtpParams setUser(User user) {
    this.user = user;
    return this;
  }

  public String getOtpSharedSecret() {
    return sharedSecret;
  }

  public OtpParams setOtpSharedSecret(String sharedSecret) {
    this.sharedSecret = sharedSecret;
    return this;
  }

  public List<String> getScratchCodes() {
    return Arrays.asList(scratchCodes);
  }

  public OtpParams setScratchCodes(List<String> scratchCodes) {
    this.scratchCodes = scratchCodes.stream().toArray(String[]::new);
    return this;
  }
}
