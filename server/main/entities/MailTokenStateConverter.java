package keyring.server.main.entities;

import java.util.Optional;
import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import keyring.server.main.entities.columns.MailTokenState;

@Converter
public class MailTokenStateConverter implements AttributeConverter<MailTokenState, Integer> {
  @Override
  public Integer convertToDatabaseColumn(MailTokenState state) {
    return Optional.ofNullable(state).map(MailTokenState::getNumber).orElse(null);
  }

  @Override
  public MailTokenState convertToEntityAttribute(Integer state) {
    return Optional.ofNullable(state).map(MailTokenState::forNumber).orElse(null);
  }
}
