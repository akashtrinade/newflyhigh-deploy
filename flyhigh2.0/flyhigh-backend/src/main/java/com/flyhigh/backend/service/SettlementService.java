package com.flyhigh.backend.service;

import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Settlement worker that transitions matured PENDING earnings through
 * SETTLEMENT_PROCESSING → AVAILABLE after validation checks pass.
 *
 * Follows the same cron + per-item try/catch pattern as SessionCleanupService.
 * All status transitions use atomic findAndModify — never read-then-write.
 */
@Service
public class SettlementService {

    private static final Logger log = LoggerFactory.getLogger(SettlementService.class);

    private final ExpertEarningRepository expertEarningRepository;
    private final InteractionRepository interactionRepository;
    private final DisputeRepository disputeRepository;
    private final RefundRepository refundRepository;
    private final PayoutRepository payoutRepository;
    private final AuditService auditService;
    private final MongoTemplate mongoTemplate;
    private final PlatformSettingsService settingsService;

    public SettlementService(ExpertEarningRepository expertEarningRepository,
                             InteractionRepository interactionRepository,
                             DisputeRepository disputeRepository,
                             RefundRepository refundRepository,
                             PayoutRepository payoutRepository,
                             AuditService auditService,
                             MongoTemplate mongoTemplate,
                             PlatformSettingsService settingsService) {
        this.expertEarningRepository = expertEarningRepository;
        this.interactionRepository = interactionRepository;
        this.disputeRepository = disputeRepository;
        this.refundRepository = refundRepository;
        this.payoutRepository = payoutRepository;
        this.auditService = auditService;
        this.mongoTemplate = mongoTemplate;
        this.settingsService = settingsService;
    }

    /**
     * Runs every 15 minutes. Finds PENDING earnings whose settlement period
     * has elapsed and attempts to transition them to AVAILABLE.
     */
    @Scheduled(cron = "${settlement.worker.cron:0 */15 * * * *}")
    public void processSettlements() {
        if (!settingsService.isSettlementEnabled()) {
            log.debug("Settlement disabled via platform settings — skipping cycle");
            return;
        }

        Instant now = Instant.now();

        // 1. Recover stuck PROCESSING earnings first (crashed mid-settlement)
        sweepStuckProcessing(now);

        // 2. Backfill legacy earnings that have null settlementEndTime
        backfillLegacySettlementTimestamps(now);

        // 3. Find PENDING earnings past their settlement window
        List<ExpertEarning> pendingEarnings = expertEarningRepository
                .findByStatusAndSettlementEndTimeBefore(EarningStatus.PENDING, now);

        if (pendingEarnings.isEmpty()) {
            log.debug("Settlement: no eligible PENDING earnings found");
            return;
        }

        int settled = 0;
        int blocked = 0;
        for (ExpertEarning earning : pendingEarnings) {
            try {
                if (settleEarning(earning, now)) {
                    settled++;
                } else {
                    blocked++;
                }
            } catch (Exception e) {
                log.warn("Settlement failed for earning {}: {}", earning.getId(), e.getMessage());
            }
        }

        log.info("Settlement cycle complete: {} settled, {} blocked (checked: {})",
                settled, blocked, pendingEarnings.size());
    }

    /**
     * Attempts to settle a single PENDING earning.
     * Returns true if settled to AVAILABLE, false if blocked.
     * Max 5 attempts before giving up and recording a permanent block reason.
     */
    private boolean settleEarning(ExpertEarning earning, Instant now) {
        // Step 1: Atomically claim PENDING → SETTLEMENT_PROCESSING
        Query claimQuery = new Query(Criteria.where("_id").is(earning.getId())
                .and("status").is(EarningStatus.PENDING));
        Update claimUpdate = new Update()
                .set("status", EarningStatus.SETTLEMENT_PROCESSING)
                .set("updatedAt", now)
                .inc("settlementAttempts", 1);
        ExpertEarning claimed = mongoTemplate.findAndModify(
                claimQuery, claimUpdate, ExpertEarning.class);

        if (claimed == null) {
            // Another worker or instance already claimed it
            return false;
        }

        int attempts = (claimed.getSettlementAttempts() > 0)
                ? claimed.getSettlementAttempts() + 1 : 1;

        String reason = runSettlementChecks(claimed);
        String correlationId = claimed.getInteractionId();

        if (reason == null) {
            // All checks passed → transition to AVAILABLE
            Query completeQuery = new Query(Criteria.where("_id").is(claimed.getId()));
            Update completeUpdate = new Update()
                    .set("status", EarningStatus.AVAILABLE)
                    .set("settledAt", now)
                    .set("updatedAt", now)
                    .unset("settlementBlockReason");
            mongoTemplate.findAndModify(completeQuery, completeUpdate, ExpertEarning.class);

            auditService.record("SETTLEMENT_COMPLETED", "EXPERT_EARNING",
                    claimed.getId(), "SYSTEM", claimed.getExpertEarningAmount(),
                    correlationId, Map.of("settlementMinutes", String.valueOf(settingsService.getSettlementPeriodMinutes())));

            log.info("Settlement complete: earning={} expertId={} amount={}",
                    claimed.getId(), claimed.getExpertId(), claimed.getExpertEarningAmount());
            return true;
        } else {
            // Check failed — decide whether to retry or permanently block
            int maxAttempts = 5;
            if (attempts >= maxAttempts) {
                // Permanent block — leave in SETTLEMENT_PROCESSING with reason
                // (admin can manually review and re-enable)
                Query permQuery = new Query(Criteria.where("_id").is(claimed.getId()));
                Update permUpdate = new Update()
                        .set("settlementBlockReason",
                                reason + " (after " + attempts + " attempts)")
                        .set("updatedAt", now);
                mongoTemplate.findAndModify(permQuery, permUpdate, ExpertEarning.class);

                log.error("Settlement permanently blocked after {} attempts: earning={} reason={}",
                        attempts, claimed.getId(), reason);
            } else {
                // Transient failure — revert to PENDING for retry
                Query revertQuery = new Query(Criteria.where("_id").is(claimed.getId()));
                Update revertUpdate = new Update()
                        .set("status", EarningStatus.PENDING)
                        .set("settlementBlockReason", reason + " (attempt " + attempts + "/" + maxAttempts + ")")
                        .set("updatedAt", now);
                mongoTemplate.findAndModify(revertQuery, revertUpdate, ExpertEarning.class);

                log.warn("Settlement blocked (attempt {}/{}): earning={} reason={}",
                        attempts, maxAttempts, claimed.getId(), reason);
            }

            auditService.record("SETTLEMENT_BLOCKED", "EXPERT_EARNING",
                    claimed.getId(), "SYSTEM", claimed.getExpertEarningAmount(),
                    correlationId, Map.of("blockReason", reason, "attempt", String.valueOf(attempts)));

            return false;
        }
    }

    /**
     * Runs all validation checks against a claimed earning.
     * Returns the block reason if any check fails, null if all pass.
     */
    private String runSettlementChecks(ExpertEarning earning) {
        // Check 1: Payment must still be valid (HELD)
        Interaction interaction = interactionRepository.findById(earning.getInteractionId()).orElse(null);
        if (interaction == null) {
            return "Interaction not found";
        }
        if (interaction.getPaymentStatus() != PaymentStatus.HELD) {
            return "Payment status is " + interaction.getPaymentStatus() + ", not HELD";
        }

        // Check 2: Session must be COMPLETED
        if (interaction.getStatus() != SessionStatus.COMPLETED) {
            return "Session status is " + interaction.getStatus() + ", not COMPLETED";
        }

        // Check 3: No active dispute
        List<Dispute> activeDisputes = disputeRepository.findByEarningId(earning.getId());
        if (activeDisputes != null) {
            for (Dispute d : activeDisputes) {
                if (d.getStatus() != DisputeStatus.RESOLVED &&
                        d.getStatus() != DisputeStatus.REJECTED) {
                    return "Active dispute: " + d.getId();
                }
            }
        }

        // Check 4: No blocking refund
        List<Refund> refunds = refundRepository.findByInteractionId(earning.getInteractionId());
        if (refunds != null) {
            for (Refund r : refunds) {
                if (r.getStatus() == RefundStatus.APPROVED ||
                        r.getStatus() == RefundStatus.PROCESSING) {
                    return "Refund in progress: " + r.getId();
                }
            }
        }

        // Check 5: No existing payout for this earning
        List<Payout> existing = payoutRepository.findByEarningIdsContains(earning.getId());
        if (existing != null && !existing.isEmpty()) {
            return "Payout already exists";
        }

        return null; // All passed
    }

    /**
     * Backfills settlementStartTime and settlementEndTime for legacy PENDING earnings
     * that were created before this feature was deployed. Without this, old earnings
     * never settle because their settlementEndTime is null.
     *
     * Uses two queries because MongoDB $lt does NOT match null values:
     *   1. PENDING with non-null settlementEndTime that has passed → ready to settle now
     *   2. PENDING with null settlementEndTime (legacy) → backfill then settle next cycle
     */
    private void backfillLegacySettlementTimestamps(Instant now) {
        // Query 1: Legacy PENDING with null settlementEndTime.
        // findByStatus alone returns all PENDING — we filter null in Java.
        List<ExpertEarning> allPending = expertEarningRepository.findByStatus(EarningStatus.PENDING);
        int backfilled = 0;
        for (ExpertEarning e : allPending) {
            if (e.getSettlementEndTime() == null) {
                Instant base = e.getCreatedAt() != null ? e.getCreatedAt() : now;
                e.setSettlementStartTime(base);
                e.setSettlementEndTime(base.plus(Duration.ofMinutes(settingsService.getSettlementPeriodMinutes())));
                e.setUpdatedAt(now);
                expertEarningRepository.save(e);
                backfilled++;
            }
        }
        if (backfilled > 0) {
            log.info("Backfilled settlement timestamps for {} legacy earnings", backfilled);
        }
    }

    /**
     * Recovers earnings stuck in SETTLEMENT_PROCESSING (e.g., server crashed mid-cycle).
     * Resets them back to PENDING so they can be re-claimed on the next cycle.
     * Preserves settlementAttempts to respect the max-attempts limit.
     */
    private void sweepStuckProcessing(Instant now) {
        Instant stuckThreshold = now.minus(Duration.ofMinutes(30));
        List<ExpertEarning> stuck = expertEarningRepository
                .findByStatusAndUpdatedAtBefore(EarningStatus.SETTLEMENT_PROCESSING, stuckThreshold);

        if (stuck.isEmpty()) return;

        int recovered = 0;
        int skipped = 0;
        for (ExpertEarning earning : stuck) {
            try {
                // Don't reset if max attempts already exhausted
                int maxAttempts = 5;
                int attempts = Math.max(0, earning.getSettlementAttempts());
                if (attempts >= maxAttempts) {
                    log.warn("Sweep skipped earning={} — already at max attempts ({}), requires manual review",
                            earning.getId(), attempts);
                    skipped++;
                    continue;
                }
                Query stuckQuery = new Query(Criteria.where("_id").is(earning.getId())
                        .and("status").is(EarningStatus.SETTLEMENT_PROCESSING));
                Update revertUpdate = new Update()
                        .set("status", EarningStatus.PENDING)
                        .unset("settlementBlockReason")
                        .set("updatedAt", now);
                // settlementAttempts is preserved (not reset) — next cycle will increment it
                mongoTemplate.findAndModify(stuckQuery, revertUpdate, ExpertEarning.class);
                recovered++;
                log.warn("Recovered stuck settlement: earning={} (attempt {}/{})",
                        earning.getId(), attempts, maxAttempts);
            } catch (Exception e) {
                log.warn("Failed to recover stuck earning {}: {}", earning.getId(), e.getMessage());
            }
        }

        if (recovered > 0 || skipped > 0) {
            log.info("Stuck settlement sweep: {} recovered, {} skipped (max attempts)",
                    recovered, skipped);
        }
    }
}
