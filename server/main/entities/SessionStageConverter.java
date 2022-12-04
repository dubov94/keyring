package keyring.server.main.entities;

import java.util.Optional;
import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import keyring.server.main.entities.columns.SessionStage;

@Converter
public class SessionStageConverter implements AttributeConverter<SessionStage, Integer> {
  @Override
  public Integer convertToDatabaseColumn(SessionStage state) {
    return Optional.ofNullable(state).map(SessionStage::getNumber).orElse(null);
  }

  @Override
  public SessionStage convertToEntityAttribute(Integer state) {
    return Optional.ofNullable(state).map(SessionStage::forNumber).orElse(null);
  }
}
