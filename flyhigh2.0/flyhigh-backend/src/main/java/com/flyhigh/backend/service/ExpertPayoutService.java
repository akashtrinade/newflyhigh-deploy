package com.flyhigh.backend.service;

import com.flyhigh.backend.exception.RazorpayXException;
import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.*;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Automatic payout engine that processes AVAILABLE earnings into payouts.
 *
 * Lifecycle: AVAILABLE → creates Payout (PROCESSING) → on success → earning PAID.
 * Follows the @Scheduled cron + per-item try/catch pattern.
 * All money movement is idempotent via earningId unique constraint on Payout.
 */
@Service
public class ExpertPayoutService {

    private static final Logger log = LoggerFactory.getLogger(ExpertPayoutService.class);

    private final ExpertEarningRepository expertEarningRepository;
    private final PayoutRepository payoutRepository;
    private final DisputeRepository disputeRepository;
    private final RefundRepository refundRepository;
    private final InteractionRepository interactionRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final MongoTemplate mongoTemplate;
    private final PlatformSettingsService settingsService;
    private final RazorpayXPayoutGateway razorpayXPayoutGateway;

    /** PROCESSING gateway payouts older than this are re-checked against RazorpayX. */
    @Value("${payout.reconcile-stuck-minutes:60}")
    private int reconcileStuckMinutes;

    /** Per-transaction UPI payout limit (₹) — larger withdrawals require bank details. */
    @Value("${payout.upi-max-amount:100000}")
    private double upiMaxAmount;

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_BASE_MINUTES = 30;

    public ExpertPayoutService(ExpertEarningRepository expertEarningRepository,
                               PayoutRepository payoutRepository,
                               DisputeRepository disputeRepository,
                               RefundRepository refundRepository,
                               InteractionRepository interactionRepository,
                               ExpertProfileRepository expertProfileRepository,
                               UserRepository userRepository,
                               AuditService auditService,
                               MongoTemplate mongoTemplate,
                               PlatformSettingsService settingsService,
                               RazorpayXPayoutGateway razorpayXPayoutGateway) {
        this.expertEarningRepository = expertEarningRepository;
        this.payoutRepository = payoutRepository;
        this.disputeRepository = disputeRepository;
        this.refundRepository = refundRepository;
        this.interactionRepository = interactionRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.mongoTemplate = mongoTemplate;
        this.settingsService = settingsService;
        this.razorpayXPayoutGateway = razorpayXPayoutGateway;
    }

    /**
     * Automatic RazorpayX payouts are active only when the gateway is
     * configured AND the platform provider setting is not "manual".
     */
    private boolean gatewayEnabled() {
        return razorpayXPayoutGateway != null
                && razorpayXPayoutGateway.isConfigured()
                && !"manual".equalsIgnoreCase(settingsService.getPayoutProvider());
    }

    /**
     * Scheduled worker: runs every 10 minutes.
     * Processes AVAILABLE earnings into payouts and retries FAILED payouts.
     */
    @Scheduled(cron = "${payout.worker.cron:0 */10 * * * *}")
    public void processPayouts() {
        if (!settingsService.isPayoutEnabled()) {
            log.debug("Payouts disabled via platform settings — skipping cycle");
            return;
        }

        Instant now = Instant.now();

        // 1. Reconcile stuck PROCESSING payouts
        reconcileStuckPayouts(now);

        // 2. Create payouts for eligible AVAILABLE earnings (only when auto-create is on;
        //    withdrawals are normally expert-initiated)
        int created = settingsService.isAutoCreateEnabled() ? createPayoutsForEligibleEarnings(now) : 0;

        // 3. Retry FAILED payouts eligible for retry
        int retried = retryFailedPayouts(now);

        if (created > 0 || retried > 0) {
            log.info("Payout cycle complete: {} created, {} retried", created, retried);
        }
    }

    /**
     * Finds AVAILABLE earnings grouped by expert. If an expert's total
     * AVAILABLE balance reaches the minimum payout threshold, all their
     * eligible AVAILABLE earnings are bundled into a single payout.
     */
    private int createPayoutsForEligibleEarnings(Instant now) {
        List<ExpertEarning> available = expertEarningRepository
                .findByStatusAndSettlementEndTimeBefore(EarningStatus.AVAILABLE, now);

        // Group by expert
        Map<String, List<ExpertEarning>> byExpert = new java.util.LinkedHashMap<>();
        for (ExpertEarning e : available) {
            byExpert.computeIfAbsent(e.getExpertId(), k -> new java.util.ArrayList<>()).add(e);
        }

        int created = 0;
        for (Map.Entry<String, List<ExpertEarning>> entry : byExpert.entrySet()) {
            String expertId = entry.getKey();
            List<ExpertEarning> expertEarnings = entry.getValue();

            // Sum total available for this expert
            double totalAvailable = expertEarnings.stream()
                    .mapToDouble(e -> e.getExpertEarningAmount() != null ? e.getExpertEarningAmount() : 0)
                    .sum();

            // Only payout if total meets the minimum threshold
            if (totalAvailable < settingsService.getPayoutMinAmount()) {
                log.debug("Expert {} total available ₹{} below min payout ₹{} — accumulating",
                        expertId, totalAvailable, settingsService.getPayoutMinAmount());
                continue;
            }

            // Create individual payouts for each eligible earning
            for (ExpertEarning earning : expertEarnings) {
                try {
                    if (createPayoutForEarning(earning)) {
                        created++;
                    }
                } catch (Exception e) {
                    log.warn("Payout creation failed for earning {}: {}", earning.getId(), e.getMessage());
                }
            }
        }
        return created;
    }

    /**
     * Creates a single payout for an AVAILABLE earning if all checks pass.
     * Returns true if payout was created.
     */
    public boolean createPayoutForEarning(ExpertEarning earning) {
        // Run eligibility checks (disputes, refunds, existing payouts) — NOT minimum threshold here,
        // threshold is checked per-expert total above
        String ineligibleReason = checkPayoutEligibility(earning);
        if (ineligibleReason != null) {
            log.debug("Earning {} not eligible for payout: {}", earning.getId(), ineligibleReason);
            return false;
        }

        double amount = earning.getExpertEarningAmount() != null ? earning.getExpertEarningAmount() : 0;
        Instant now = Instant.now();
        String idempotencyKey = "EXP:" + earning.getId();

        // Atomically claim the earning first — only one worker/request wins
        ExpertEarning claimed = claimEarning(earning.getId(), now);
        if (claimed == null) {
            log.debug("Earning {} already claimed by another payout cycle", earning.getId());
            return false;
        }

        // Create payout (unique idempotencyKey also prevents duplicates)
        Payout payout = Payout.builder()
                .expertId(earning.getExpertId())
                .earningIds(List.of(earning.getId()))
                .payoutAmount(amount)
                .idempotencyKey(idempotencyKey)
                .status(PayoutStatus.PROCESSING)
                .createdAt(now)
                .retryCount(0)
                .build();

        try {
            payoutRepository.save(payout);

            // Update earning with payout reference
            earning.setPayoutId(payout.getId());
            earning.setUpdatedAt(now);
            expertEarningRepository.save(earning);

            auditService.record("PAYOUT_CREATED", "PAYOUT",
                    payout.getId(), "SYSTEM", amount,
                    earning.getInteractionId(),
                    Map.of("earningId", earning.getId(), "expertId", earning.getExpertId()));

            log.info("Payout created: payoutId={} expertId={} amount={}",
                    payout.getId(), earning.getExpertId(), amount);
            return true;

        } catch (org.springframework.dao.DuplicateKeyException e) {
            // Another cycle created the payout for this earning — release our claim
            releaseClaimedEarnings(List.of(earning), now);
            log.debug("Duplicate payout prevented for earning {}", earning.getId());
            return false;
        } catch (Exception e) {
            // Compensate: remove the orphan payout and release the claim
            releaseClaimedEarnings(List.of(earning), now);
            try {
                payoutRepository.delete(payout);
            } catch (Exception cleanup) {
                log.warn("Failed to clean up orphan payout {}: {}", payout.getId(), cleanup.getMessage());
            }
            log.warn("Payout creation failed for earning {}: {}", earning.getId(), e.getMessage());
            return false;
        }
    }

    /**
     * Result of an expert-initiated withdrawal request.
     */
    public record WithdrawalResult(boolean success, String message, Payout payout,
                                   double amount, int earningCount) {
        public static WithdrawalResult error(String message) {
            return new WithdrawalResult(false, message, null, 0, 0);
        }

        public static WithdrawalResult ok(Payout payout, double amount, int earningCount) {
            return new WithdrawalResult(true, null, payout, amount, earningCount);
        }
    }

    /**
     * Expert-initiated withdrawal: bundles all eligible AVAILABLE earnings into
     * a single payout request (PROCESSING). In manual mode the admin completes
     * the payout after making the actual bank/UPI transfer.
     *
     * Each earning is claimed with an atomic findAndModify (AVAILABLE → PROCESSING)
     * BEFORE the payout is created, so two concurrent withdrawal requests can never
     * pay out the same earnings twice. Un-claimed earnings are skipped; if the
     * payout creation fails, claims are released back to AVAILABLE.
     */
    public WithdrawalResult requestWithdrawal(String expertId, ExpertProfile profile) {
        // 1. Payout destination must be on file
        if (profile == null) {
            return WithdrawalResult.error("Complete your expert profile first.");
        }
        boolean hasBank = isNotBlank(profile.getPayoutAccountNumber())
                && isNotBlank(profile.getPayoutIfsc())
                && isNotBlank(profile.getPayoutAccountHolderName());
        boolean hasUpi = isNotBlank(profile.getPayoutUpiId());
        if (!hasBank && !hasUpi) {
            return WithdrawalResult.error("Add your bank or UPI details before withdrawing.");
        }

        // 2. Atomically claim eligible AVAILABLE earnings for this expert.
        //    findAndModify returns null if another request already claimed the earning.
        Instant now = Instant.now();
        List<ExpertEarning> claimed = new java.util.ArrayList<>();
        for (ExpertEarning e : expertEarningRepository.findByStatus(EarningStatus.AVAILABLE)) {
            if (!expertId.equals(e.getExpertId()) || checkPayoutEligibility(e) != null) {
                continue;
            }
            ExpertEarning claimedEarning = claimEarning(e.getId(), now);
            if (claimedEarning != null) {
                claimed.add(claimedEarning);
            }
        }
        if (claimed.isEmpty()) {
            return WithdrawalResult.error("No eligible earnings to withdraw right now.");
        }

        double total = claimed.stream()
                .mapToDouble(e -> e.getExpertEarningAmount() != null ? e.getExpertEarningAmount() : 0)
                .sum();
        if (total < settingsService.getPayoutMinAmount()) {
            releaseClaimedEarnings(claimed, now);
            return WithdrawalResult.error("Minimum withdrawal is ₹" + (long) settingsService.getPayoutMinAmount()
                    + ". Your withdrawable balance is ₹" + (long) total + ".");
        }

        // 3. Create one bundled payout with a bank-details snapshot
        Payout payout = Payout.builder()
                .expertId(expertId)
                .earningIds(claimed.stream().map(ExpertEarning::getId).toList())
                .payoutAmount(total)
                .idempotencyKey("WD:" + UUID.randomUUID())
                .status(PayoutStatus.PROCESSING)
                .accountHolderName(profile.getPayoutAccountHolderName())
                .accountNumber(profile.getPayoutAccountNumber())
                .ifsc(profile.getPayoutIfsc())
                .upiId(profile.getPayoutUpiId())
                .createdAt(now)
                .retryCount(0)
                .build();

        try {
            payoutRepository.save(payout);
        } catch (Exception e) {
            // Release claims so the expert can retry
            releaseClaimedEarnings(claimed, now);
            log.warn("Withdrawal payout creation failed for expert {}: {}", expertId, e.getMessage());
            if (e instanceof org.springframework.dao.DuplicateKeyException) {
                return WithdrawalResult.error("A withdrawal was already requested — try again in a moment.");
            }
            return WithdrawalResult.error("Withdrawal request failed. Please try again.");
        }

        for (ExpertEarning e : claimed) {
            e.setPayoutId(payout.getId());
            e.setUpdatedAt(now);
            expertEarningRepository.save(e);
        }

        auditService.record("PAYOUT_REQUESTED", "PAYOUT",
                payout.getId(), expertId, total,
                null, Map.of("earningCount", String.valueOf(claimed.size())));

        // 4. Automatic RazorpayX transfer. On gateway failure the payout is
        //    marked FAILED and the earnings are released so the expert can
        //    retry. (When the gateway is disabled the payout stays PROCESSING
        //    for the manual admin flow.)
        if (gatewayEnabled()) {
            try {
                gatewayDisburse(payout, profile);
                auditService.record("PAYOUT_GATEWAY_CREATED", "PAYOUT",
                        payout.getId(), expertId, total,
                        null, Map.of("gatewayPayoutId", String.valueOf(payout.getGatewayPayoutId())));
            } catch (Exception e) {
                log.warn("Gateway payout creation failed for payout {}: {}", payout.getId(), e.getMessage());
                String message = friendlyGatewayError(e);
                failPayout(payout, message);
                return WithdrawalResult.error(message);
            }
        }

        log.info("Withdrawal requested: payoutId={} expertId={} amount={} earnings={}",
                payout.getId(), expertId, total, claimed.size());
        return WithdrawalResult.ok(payout, total, claimed.size());
    }

    /**
     * Disburses a withdrawal through RazorpayX: reuses/creates the expert's
     * contact, creates a fund account from the payout's bank/UPI snapshot, and
     * submits an immediate payout. Stores the gateway ids on the payout so the
     * webhook and reconcile worker can match it later.
     */
    private void gatewayDisburse(Payout payout, ExpertProfile profile) {
        boolean hasUpi = isNotBlank(payout.getUpiId());
        double amount = payout.getPayoutAmount() != null ? payout.getPayoutAmount() : 0;
        long amountPaise = BigDecimal.valueOf(amount).movePointRight(2).longValueExact();

        // UPI per-transaction limit — larger withdrawals must go through bank
        if (hasUpi && amount > upiMaxAmount) {
            throw new IllegalArgumentException("UPI withdrawals are limited to ₹" + (long) upiMaxAmount
                    + ". Add your bank details for larger withdrawals.");
        }

        // Bank-mode withdrawals require verified details (when validation ran).
        // null status = validation unsupported (test mode / non-Lite account) — fail open.
        if (!hasUpi && profile != null) {
            String verification = profile.getPayoutVerificationStatus();
            if ("PENDING".equals(verification)) {
                throw new IllegalStateException("Your bank details are being verified — try again in a few minutes.");
            }
            if ("FAILED".equals(verification)) {
                String note = isNotBlank(profile.getPayoutVerificationNote())
                        ? ": " + profile.getPayoutVerificationNote() : "";
                throw new IllegalStateException("Bank verification failed" + note
                        + ". Save your bank details again to re-verify.");
            }
        }

        String contactId = resolveContact(payout.getExpertId(), profile);
        String fundAccountId = createFundAccount(contactId, payout, profile);
        String mode = RazorpayXPayoutGateway.selectMode(hasUpi, amountPaise);

        JSONObject created = razorpayXPayoutGateway.createPayout(
                fundAccountId, amountPaise, mode,
                payout.getIdempotencyKey(), "FlyHigh payout", payout.getId());

        payout.setGatewayPayoutId(created.optString("id"));
        payout.setGatewayFundAccountId(fundAccountId);
        payout.setGatewayContactId(contactId);
        payout.setMode(mode);
        payoutRepository.save(payout);

        log.info("Gateway payout created: payoutId={} gatewayPayoutId={} mode={}",
                payout.getId(), payout.getGatewayPayoutId(), mode);
    }

    /** Fetches the expert's RazorpayX contact by reference id, creating it on first use. */
    private String resolveContact(String expertId, ExpertProfile profile) {
        String referenceId = "expert_" + expertId;
        String existing = razorpayXPayoutGateway.fetchContactByReference(referenceId);
        if (existing != null) {
            return existing;
        }

        User user = userRepository.findById(expertId).orElse(null);
        String name = user != null && isNotBlank(user.getFullName()) ? user.getFullName()
                : (profile != null && isNotBlank(profile.getPayoutAccountHolderName())
                    ? profile.getPayoutAccountHolderName() : "Expert " + expertId);
        String email = user != null && isNotBlank(user.getEmail())
                ? user.getEmail() : "expert+" + expertId + "@flyhigh.local";

        String contactId;
        try {
            contactId = razorpayXPayoutGateway.createContact(name, email, referenceId, expertId);
        } catch (RazorpayXException e) {
            // A concurrent withdrawal may have created the contact first — re-fetch once.
            String raced = razorpayXPayoutGateway.fetchContactByReference(referenceId);
            if (raced == null) {
                throw e;
            }
            contactId = raced;
        }

        if (profile != null) {
            profile.setPayoutContactId(contactId);
            expertProfileRepository.save(profile);
        }
        return contactId;
    }

    /**
     * Returns a fund account for the payout's destination snapshot. Reuses the
     * stored fund account only when the expert's currently-saved details still
     * match the snapshot; otherwise creates a new one (RazorpayX dedupes
     * identical contact/detail tuples server-side).
     */
    private String createFundAccount(String contactId, Payout payout, ExpertProfile profile) {
        boolean hasUpi = isNotBlank(payout.getUpiId());

        if (profile != null && isNotBlank(profile.getPayoutFundAccountId())) {
            boolean sameDetails = hasUpi
                    ? Objects.equals(profile.getPayoutUpiId(), payout.getUpiId())
                    : Objects.equals(profile.getPayoutAccountNumber(), payout.getAccountNumber())
                        && Objects.equals(profile.getPayoutIfsc(), payout.getIfsc());
            if (sameDetails) {
                return profile.getPayoutFundAccountId();
            }
        }

        JSONObject details;
        if (hasUpi) {
            details = new JSONObject().put("address", payout.getUpiId());
        } else {
            details = new JSONObject()
                    .put("name", payout.getAccountHolderName())
                    .put("ifsc", payout.getIfsc())
                    .put("account_number", payout.getAccountNumber());
        }
        String fundAccountId = razorpayXPayoutGateway.createFundAccount(contactId, hasUpi, details);

        if (profile != null) {
            profile.setPayoutFundAccountId(fundAccountId);
            expertProfileRepository.save(profile);
        }
        return fundAccountId;
    }

    /** Maps gateway/validation failures to safe, user-facing messages. */
    private String friendlyGatewayError(Throwable t) {
        if (t instanceof RazorpayXException rxe) {
            return rxe.getMessage();
        }
        if (t instanceof IllegalArgumentException || t instanceof IllegalStateException) {
            return t.getMessage();
        }
        return "Withdrawal could not be sent to the payout gateway. Please try again.";
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (isNotBlank(v)) return v;
        }
        return null;
    }

    /**
     * Atomically transitions an AVAILABLE earning to payout PROCESSING.
     * Returns the claimed earning, or null if another request already claimed it.
     */
    private ExpertEarning claimEarning(String earningId, Instant now) {
        Query claimQuery = new Query(Criteria.where("_id").is(earningId)
                .and("status").is(EarningStatus.AVAILABLE)
                .and("payoutId").is(null));
        Update claimUpdate = new Update()
                .set("payoutStatus", "PROCESSING")
                .set("updatedAt", now);
        return mongoTemplate.findAndModify(claimQuery, claimUpdate, ExpertEarning.class);
    }

    /**
     * Releases claimed earnings back to a claimable state when a withdrawal
     * request fails (below threshold or payout creation error).
     */
    private void releaseClaimedEarnings(List<ExpertEarning> claimed, Instant now) {
        for (ExpertEarning e : claimed) {
            Query releaseQuery = new Query(Criteria.where("_id").is(e.getId())
                    .and("payoutStatus").is("PROCESSING"));
            Update releaseUpdate = new Update()
                    .unset("payoutStatus")
                    .set("updatedAt", now);
            mongoTemplate.findAndModify(releaseQuery, releaseUpdate, ExpertEarning.class);
        }
    }

    private boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * Completes a payout: marks Payout SUCCESS, earning PAID, interaction PAID.
     */
    public void completePayout(Payout payout, String gatewayReferenceId) {
        // Terminal-state guard — duplicate webhooks / reconcile races are no-ops.
        if (payout.getStatus() == PayoutStatus.SUCCESS) {
            log.debug("Payout {} already SUCCESS — ignoring duplicate completion", payout.getId());
            return;
        }
        if (payout.getStatus() == PayoutStatus.FAILED) {
            log.warn("Payout {} is FAILED — not flipping to SUCCESS (earnings may have been re-withdrawn)", payout.getId());
            return;
        }

        Instant now = Instant.now();

        // Update payout
        payout.setStatus(PayoutStatus.SUCCESS);
        payout.setGatewayReferenceId(gatewayReferenceId);
        payout.setProcessedAt(now);
        payoutRepository.save(payout);

        // Update all linked earnings + interactions
        for (String earningId : payout.getEarningIds() != null ? payout.getEarningIds() : List.<String>of()) {
            ExpertEarning earning = expertEarningRepository.findById(earningId).orElse(null);
            if (earning == null) continue;

            earning.setStatus(EarningStatus.PAID);
            earning.setPayoutStatus("SUCCESS");
            earning.setUpdatedAt(now);
            expertEarningRepository.save(earning);

            // Update interaction paymentStatus (closes the loop the model always intended)
            interactionRepository.findById(earning.getInteractionId()).ifPresent(interaction -> {
                interaction.setPaymentStatus(PaymentStatus.PAID);
                interaction.setPayoutId(payout.getId());
                interactionRepository.save(interaction);
            });
        }

        auditService.record("PAYOUT_SUCCESS", "PAYOUT",
                payout.getId(), "SYSTEM", payout.getPayoutAmount(),
                null, Map.of("earningCount",
                        String.valueOf(payout.getEarningIds() != null ? payout.getEarningIds().size() : 0),
                        "gatewayRef", gatewayReferenceId));

        log.info("Payout completed: payoutId={} gatewayRef={} amount={}",
                payout.getId(), gatewayReferenceId, payout.getPayoutAmount());
    }

    /**
     * Marks a payout as FAILED and releases its earnings back to AVAILABLE
     * (clears payout linkage) so the expert can request a new withdrawal.
     */
    public void failPayout(Payout payout, String errorMessage) {
        // Terminal-state guard — a late failure webhook after SUCCESS must not
        // release already-paid earnings.
        if (payout.getStatus() == PayoutStatus.FAILED) {
            log.debug("Payout {} already FAILED — ignoring duplicate failure", payout.getId());
            return;
        }
        if (payout.getStatus() == PayoutStatus.SUCCESS) {
            log.warn("Payout {} already SUCCESS — ignoring failure event: {}", payout.getId(), errorMessage);
            return;
        }

        Instant now = Instant.now();
        int retryCount = payout.getRetryCount() != null ? payout.getRetryCount() : 0;

        payout.setStatus(PayoutStatus.FAILED);
        payout.setErrorMessage(errorMessage);
        payout.setRetryCount(retryCount + 1);
        payout.setLastRetryAt(now);
        payoutRepository.save(payout);

        // Release linked earnings for re-withdrawal
        for (String earningId : payout.getEarningIds() != null ? payout.getEarningIds() : List.<String>of()) {
            ExpertEarning earning = expertEarningRepository.findById(earningId).orElse(null);
            if (earning == null) continue;
            earning.setPayoutStatus("FAILED");
            earning.setPayoutId(null);
            earning.setUpdatedAt(now);
            expertEarningRepository.save(earning);
        }

        auditService.record("PAYOUT_FAILED", "PAYOUT",
                payout.getId(), "SYSTEM", payout.getPayoutAmount(),
                null, Map.of("error", errorMessage, "retryCount", String.valueOf(retryCount)));

        log.warn("Payout failed: payoutId={} error={}",
                payout.getId(), errorMessage);
    }

    /**
     * Retries FAILED payouts that are within retry limits.
     * Manual mode: failed payouts release their earnings via failPayout(),
     * and the expert requests a new withdrawal. Gateway-mode retry can be added here.
     */
    private int retryFailedPayouts(Instant now) {
        return 0;
    }

    /**
     * Reconciles PROCESSING gateway payouts that have been stuck — re-checks
     * their status at RazorpayX and completes/fails them accordingly. Covers
     * the case where a webhook was missed. Manual-mode payouts (no
     * gatewayPayoutId) are left for the admin.
     */
    private void reconcileStuckPayouts(Instant now) {
        if (!gatewayEnabled()) {
            log.debug("Payout reconciliation skipped (gateway disabled)");
            return;
        }
        List<Payout> stuck = payoutRepository.findByStatusAndGatewayPayoutIdNotNullAndCreatedAtBefore(
                PayoutStatus.PROCESSING, now.minus(reconcileStuckMinutes, ChronoUnit.MINUTES));
        for (Payout p : stuck) {
            try {
                reconcileOne(p);
            } catch (Exception e) {
                log.warn("Payout reconciliation failed for payout {}: {}", p.getId(), e.getMessage());
            }
        }
        if (!stuck.isEmpty()) {
            log.info("Payout reconciliation checked {} stuck payout(s)", stuck.size());
        }
    }

    /** Re-checks one stuck gateway payout and applies the gateway's terminal state. */
    private void reconcileOne(Payout stale) {
        // Re-read fresh — a webhook may have resolved it between query and now.
        Payout payout = payoutRepository.findById(stale.getId()).orElse(null);
        if (payout == null || payout.getStatus() != PayoutStatus.PROCESSING
                || !isNotBlank(payout.getGatewayPayoutId())) {
            return;
        }

        JSONObject entity = razorpayXPayoutGateway.fetchPayout(payout.getGatewayPayoutId());
        String status = entity.optString("status");
        switch (status) {
            case "processed" -> completePayout(payout, entity.optString("utr"));
            case "reversed", "failed", "rejected", "cancelled" -> {
                JSONObject statusDetails = entity.optJSONObject("status_details");
                String reason = firstNonBlank(
                        entity.optString("failure_reason"),
                        statusDetails != null ? statusDetails.optString("reason") : null,
                        status);
                failPayout(payout, "Gateway: " + reason);
            }
            default -> log.debug("Payout {} still {} at gateway — waiting", payout.getId(), status);
        }
    }

    /**
     * Checks all eligibility criteria for an earning to be paid out.
     * Returns null if eligible, or a reason string if not.
     */
    public String checkPayoutEligibility(ExpertEarning earning) {
        // 1. Must be AVAILABLE
        if (earning.getStatus() != EarningStatus.AVAILABLE) {
            return "Status is " + earning.getStatus() + ", not AVAILABLE";
        }

        // 2. No active dispute
        List<Dispute> disputes = disputeRepository.findByEarningId(earning.getId());
        if (disputes != null) {
            for (Dispute d : disputes) {
                if (d.getStatus() != DisputeStatus.RESOLVED &&
                        d.getStatus() != DisputeStatus.REJECTED) {
                    return "Active dispute: " + d.getId();
                }
            }
        }

        // 3. No blocking refund
        List<Refund> refunds = refundRepository.findByInteractionId(earning.getInteractionId());
        if (refunds != null) {
            for (Refund r : refunds) {
                if (r.getStatus() == RefundStatus.APPROVED ||
                        r.getStatus() == RefundStatus.PROCESSING) {
                    return "Refund in progress: " + r.getId();
                }
            }
        }

        // 4. No open payout already contains this earning (FAILED payouts don't block)
        List<Payout> existing = payoutRepository.findByEarningIdsContains(earning.getId());
        if (existing != null) {
            for (Payout p : existing) {
                if (p.getStatus() != PayoutStatus.FAILED) {
                    return "Payout already exists";
                }
            }
        }

        return null; // All checks passed
    }
}
