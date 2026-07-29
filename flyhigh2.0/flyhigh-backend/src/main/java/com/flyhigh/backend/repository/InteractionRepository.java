package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface InteractionRepository extends MongoRepository<Interaction, String> {
    List<Interaction> findByClientId(String clientId);
    List<Interaction> findByExpertId(String expertId);
    long countByIsSeedDataTrue();
    void deleteByIsSeedDataTrueOrSeedSource(String seedSource);

    // Find active interaction between a client and expert
    Optional<Interaction> findTopByClientIdAndExpertIdAndStatusOrderByStartedAtDesc(
            String clientId, String expertId, com.flyhigh.backend.model.SessionStatus status);

    long countByStatus(com.flyhigh.backend.model.SessionStatus status);

    /** Indexed lookup for webhook handler — O(log n) instead of full table scan. */
    Optional<Interaction> findByRazorpayOrderId(String razorpayOrderId);

    /** Finds stale sessions for cleanup: FREE_SESSION or PAYMENT_PENDING started before cutoff. */
    List<Interaction> findByStatusInAndStartedAtBefore(List<SessionStatus> statuses, Instant cutoff);
}
