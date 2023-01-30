package keyring.server.main.entities;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.MapsId;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import javax.persistence.Version;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "feature_prompts")
public class FeaturePrompts {
  @Id
  @Column(name = "user_identifier")
  private long userIdentifier;

  @MapsId
  @OneToOne(fetch = FetchType.LAZY)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User user;

  @Version private long version;

  @Column private boolean release;

  public FeaturePrompts setUser(User user) {
    this.user = user;
    return this;
  }

  public boolean getRelease() {
    return release;
  }

  public FeaturePrompts setRelease(boolean release) {
    this.release = release;
    return this;
  }
}
