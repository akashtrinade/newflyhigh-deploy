package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.SessionPayment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionPaymentRepository extends MongoRepository<SessionPayment, String> {
    List<SessionPayment> findByInteractionId(String interactionId);
}
