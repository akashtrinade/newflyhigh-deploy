package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.CallRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CallRequestRepository extends MongoRepository<CallRequest, String> {
    List<CallRequest> findByClientIdOrderByCreatedAtDesc(String clientId);
    List<CallRequest> findByClientEmailOrderByCreatedAtDesc(String clientEmail);
    List<CallRequest> findByExpertIdOrderByCreatedAtDesc(String expertId);
    Optional<CallRequest> findTopByExpertIdAndStatusOrderByCreatedAtDesc(String expertId, String status);
    Optional<CallRequest> findTopByClientIdAndStatusOrderByCreatedAtDesc(String clientId, String status);
    List<CallRequest> findByExpertIdAndStatus(String expertId, String status);
    List<CallRequest> findByExpertIdAndReviewSubmittedTrueOrderByCreatedAtDesc(String expertId);
    Optional<CallRequest> findByInteractionId(String interactionId);
    long countByIsSeedDataTrue();
    void deleteByIsSeedDataTrueOrSeedSource(String seedSource);
}
