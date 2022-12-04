package keyring.server.main.entities;

import java.util.Optional;
import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import keyring.server.main.entities.columns.UserState;

@Converter
public class UserStateConverter implements AttributeConverter<UserState, Integer> {
  @Override
  public Integer convertToDatabaseColumn(UserState state) {
    return Optional.ofNullable(state).map(UserState::getNumber).orElse(null);
  }

  @Override
  public UserState convertToEntityAttribute(Integer state) {
    return Optional.ofNullable(state).map(UserState::forNumber).orElse(null);
  }
}
