package server.main.entities;

import javax.persistence.*;
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

  public FeaturePrompts setUser(User user) {
    this.user = user;
    return this;
  }
}
