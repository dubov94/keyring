package com.floreina.keyring;

import com.floreina.keyring.aspects.Annotations.EntityController;
import com.floreina.keyring.aspects.Annotations.LocalTransaction;
import com.floreina.keyring.entities.*;

import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Root;
import java.sql.Timestamp;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalUnit;
import java.util.function.BiFunction;

public class EntitiesExpiration {
  private Chronometry chronometry;

  @EntityController private EntityManager entityManager;

  @Inject
  EntitiesExpiration(Chronometry chronometry) {
    this.chronometry = chronometry;
  }

  void dropExpiredMailTokens() {
    deleteEntitiesByRestriction(
        MailToken.class,
        (criteriaBuilder, root) ->
            criteriaBuilder.lessThan(
                root.get(MailToken_.timestamp), createTimestampInThePast(10, ChronoUnit.MINUTES)));
  }

  void dropExpiredPendingUsers() {
    deleteEntitiesByRestriction(
        User.class,
        (criteriaBuilder, root) ->
            criteriaBuilder.and(
                criteriaBuilder.equal(root.get(User_.state), User.State.PENDING),
                criteriaBuilder.lessThan(
                    root.get(User_.timestamp), createTimestampInThePast(15, ChronoUnit.MINUTES))));
  }

  void dropExpiredSessions() {
    deleteEntitiesByRestriction(
        Session.class,
        (criteriaBuilder, root) ->
            criteriaBuilder.lessThan(
                root.get(Session_.timestamp), createTimestampInThePast(28, ChronoUnit.DAYS)));
  }

  private Timestamp createTimestampInThePast(int amountToSubtract, TemporalUnit temporalUnit) {
    return Timestamp.from(
        chronometry.subtract(chronometry.currentTime(), amountToSubtract, temporalUnit));
  }

  @LocalTransaction
  private <T> void deleteEntitiesByRestriction(
      Class<T> typeClass,
      BiFunction<CriteriaBuilder, Root<T>, Expression<Boolean>> createRestriction) {
    CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
    CriteriaDelete<T> criteriaDelete = criteriaBuilder.createCriteriaDelete(typeClass);
    Root<T> root = criteriaDelete.from(typeClass);
    criteriaDelete.where(createRestriction.apply(criteriaBuilder, root));
    entityManager.createQuery(criteriaDelete).executeUpdate();
  }
}
