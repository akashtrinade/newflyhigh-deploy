package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.EarningStatus;
import com.flyhigh.backend.model.ExpertEarning;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Optional;

@Repository
public interface ExpertEarningRepository extends MongoRepository<ExpertEarning, String> {

    /** Used by getEarningsSummary — needs all records for aggregation. */
    List<ExpertEarning> findByExpertId(String expertId);

    Optional<ExpertEarning> findByInteractionId(String interactionId);

    Page<ExpertEarning> findByExpertIdOrderByCreatedAtDesc(String expertId, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndStatusOrderByCreatedAtDesc(
            String expertId, EarningStatus status, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String expertId, Instant fromDate, Instant toDate, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndStatusAndCreatedAtBetweenOrderByCreatedAtDesc(
            String expertId, EarningStatus status, Instant fromDate, Instant toDate, Pageable pageable);

    long countByExpertId(String expertId);
}
