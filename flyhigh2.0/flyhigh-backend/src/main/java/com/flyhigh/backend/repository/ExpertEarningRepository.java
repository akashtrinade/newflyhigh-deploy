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

@Repository
public interface ExpertEarningRepository extends MongoRepository<ExpertEarning, String> {

    /** Used by getEarningsSummary — needs all records for aggregation. */
    List<ExpertEarning> findByExpertId(String expertId);

    Optional<ExpertEarning> findByInteractionId(String interactionId);

    Page<ExpertEarning> findByExpertIdOrderByCreatedAtDesc(String expertId, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndStatusOrderByCreatedAtDesc(
            String expertId, EarningStatus status, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndStatusInOrderByCreatedAtDesc(
            String expertId, List<EarningStatus> statuses, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String expertId, Instant fromDate, Instant toDate, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndStatusAndCreatedAtBetweenOrderByCreatedAtDesc(
            String expertId, EarningStatus status, Instant fromDate, Instant toDate, Pageable pageable);

    Page<ExpertEarning> findByExpertIdAndStatusInAndCreatedAtBetweenOrderByCreatedAtDesc(
            String expertId, List<EarningStatus> statuses, Instant fromDate, Instant toDate, Pageable pageable);

    long countByExpertId(String expertId);

    // ── Settlement queries ──
    /** Find ALL earnings by status (used for backfill, not paginated). */
    List<ExpertEarning> findByStatus(EarningStatus status);

    /** Find earnings by status with pagination (admin). */
    Page<ExpertEarning> findByStatus(EarningStatus status, Pageable pageable);

    /** Find PENDING earnings whose settlement period has elapsed. */
    List<ExpertEarning> findByStatusAndSettlementEndTimeBefore(EarningStatus status, Instant cutoff);

    /** Find stuck SETTLEMENT_PROCESSING earnings older than threshold. */
    List<ExpertEarning> findByStatusAndUpdatedAtBefore(EarningStatus status, Instant threshold);
}
