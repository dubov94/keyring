package server.main.entities;

import com.vladmihalcea.hibernate.type.array.StringArrayType;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;
import javax.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@Entity
@Table(name = "otp_params")
@TypeDef(name = "string-array", typeClass = StringArrayType.class)
public class OtpParams {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long identifier;

  @CreationTimestamp private Timestamp timestamp;

  @ManyToOne
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Column(name = "shared_secret")
  private String sharedSecret;

  @Type(type = "string-array")
  @Column(name = "scratch_codes", columnDefinition = "text[]")
  // Not `List` due to https://github.com/vladmihalcea/hibernate-types/issues/137.
  private String[] scratchCodes;

  public long getIdentifier() {
    return identifier;
  }

  public OtpParams setIdentifier(long identifier) {
    this.identifier = identifier;
    return this;
  }

  public OtpParams setUser(User user) {
    this.user = user;
    return this;
  }

  public String getSharedSecret() {
    return sharedSecret;
  }

  public OtpParams setSharedSecret(String sharedSecret) {
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
