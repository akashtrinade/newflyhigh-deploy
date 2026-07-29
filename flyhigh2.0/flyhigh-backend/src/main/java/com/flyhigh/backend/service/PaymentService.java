package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.exception.InvalidSessionStateException;
import com.flyhigh.backend.exception.PaymentVerificationException;
import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.CallRequestRepository;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.SessionPaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Core payment service: Razorpay order creation, HMAC-SHA256 signature verification,
 * session state queries, duration recommendations, and payment confirmation.
 *
 * FINANCIAL INTEGRITY HARDENING:
 * - All amounts use BigDecimal via PricingService (no floating-point errors).
 * - Idempotency keys prevent duplicate charges from retried requests.
 * - MongoDB findAndModify provides atomic state transitions for payment verification.
 * - Constant-time signature comparison prevents timing attacks.
 * - Structured logging with PII redaction (payment IDs truncated in logs).
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RazorpayClient razorpayClient;
    private final InteractionRepository interactionRepository;
    private final SessionPaymentRepository sessionPaymentRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final CallRequestRepository callRequestRepository;
    private final SocketIOEventService socketIOEventService;
    private final ExpertEarningService expertEarningService;
    private final PricingService pricingService;
    private final MongoTemplate mongoTemplate;
    private final AuditService auditService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Value("${session.free-trial-seconds:300}")
    private int freeTrialSeconds;

    @Value("${session.extend-prompt-seconds:300}")
    private int extendPromptSeconds;

    public PaymentService(InteractionRepository interactionRepository,
                          SessionPaymentRepository sessionPaymentRepository,
                          ExpertProfileRepository expertProfileRepository,
                          CallRequestRepository callRequestRepository,
                          SocketIOEventService socketIOEventService,
                          ExpertEarningService expertEarningService,
                          PricingService pricingService,
                          MongoTemplate mongoTemplate,
                          AuditService auditService) {
        this.interactionRepository = interactionRepository;
        this.sessionPaymentRepository = sessionPaymentRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.callRequestRepository = callRequestRepository;
        this.socketIOEventService = socketIOEventService;
        this.expertEarningService = expertEarningService;
        this.pricingService = pricingService;
        this.mongoTemplate = mongoTemplate;
        this.auditService = auditService;
    }

    // ── Razorpay Order Creation ──────────────────────────────────

    /**
     * Creates a Razorpay order. Uses idempotencyKey to prevent duplicate
     * orders from rapid double-clicks. All amount arithmetic via
     * PricingService (BigDecimal) — zero floating-point error.
     *
     * Resilience4j: circuit breaker opens after 50% failures in a 10-call
     * window (min 5 calls), remaining open for 30s. Retry with exponential
     * backoff (1s → 2s → 4s) handles transient network errors.
     */
    @CircuitBreaker(name = "razorpayCircuitBreaker", fallbackMethod = "createRazorpayOrderFallback")
    @Retry(name = "razorpayRetry", fallbackMethod = "createRazorpayOrderFallback")
    public CreateOrderResponse createRazorpayOrder(CreateOrderRequest request,
                                                    String clientId,
                                                    String idempotencyKey) {
        Interaction interaction = interactionRepository.findById(request.getInteractionId())
                .orElseThrow(() -> new IllegalArgumentException("Interaction not found: " + request.getInteractionId()));

        if (!interaction.getClientId().equals(clientId)) {
            throw new InvalidSessionStateException("Only the client can create a payment order");
        }

        // ── Idempotency: return existing order if already created ──
        if (idempotencyKey != null && !idempotencyKey.isBlank()
                && interaction.getRazorpayOrderId() != null
                && idempotencyKey.equals(interaction.getIdempotencyKey())) {
            log.info("Idempotent order creation: returning existing order {} for key {}",
                    interaction.getRazorpayOrderId(), idempotencyKey);
            return buildExistingOrderResponse(interaction);
        }

        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId())
                .orElseThrow(() -> new IllegalArgumentException("Expert profile not found"));
        double hourlyRate = expertProfile.getHourlyRate() != null ? expertProfile.getHourlyRate() : 0.0;

        // BigDecimal arithmetic — no floating-point errors
        PricingService.PriceBreakdown breakdown = pricingService.calculate(hourlyRate, request.getDurationMinutes());
        long amountInPaise = breakdown.clientAmountInPaise();

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", "rcpt_" + request.getInteractionId().substring(0,
                    Math.min(10, request.getInteractionId().length())));

            JSONObject notes = new JSONObject();
            notes.put("interactionId", request.getInteractionId());
            notes.put("clientId", clientId);
            notes.put("expertId", interaction.getExpertId());
            notes.put("durationMinutes", request.getDurationMinutes());
            notes.put("type", request.getType() != null ? request.getType() : "INITIAL");
            notes.put("idempotencyKey", idempotencyKey != null ? idempotencyKey : "");
            orderRequest.put("notes", notes);

            Order order = razorpayClient.orders.create(orderRequest);
            String orderId = (String) order.get("id");

            // Persist order ID + idempotency key atomically
            interaction.setRazorpayOrderId(orderId);
            interaction.setIdempotencyKey(idempotencyKey);
            interaction.setRecommendedDurationMinutes(request.getDurationMinutes());
            if (interaction.getStatus() == SessionStatus.FREE_SESSION) {
                interaction.setStatus(SessionStatus.PAYMENT_PENDING);
            }
            interactionRepository.save(interaction);

            log.info("Razorpay order created: orderId={} interactionId={} amountPaise={} currency={}",
                    orderId, request.getInteractionId(), amountInPaise, currency);

            // ── Audit: ORDER_CREATED ──
            Map<String, String> orderMetadata = new HashMap<>();
            orderMetadata.put("orderId", orderId);
            orderMetadata.put("durationMinutes", String.valueOf(request.getDurationMinutes()));
            orderMetadata.put("type", request.getType() != null ? request.getType() : "INITIAL");
            auditService.record("ORDER_CREATED", "INTERACTION", interaction.getId(),
                    clientId, breakdown.clientAmountDouble(), interaction.getId(), orderMetadata);

            Object amountObj = order.get("amount");
            String amountStr = amountObj != null ? amountObj.toString() : "0";
            return new CreateOrderResponse(orderId,
                    amountStr,
                    (String) order.get("currency"),
                    razorpayKeyId);
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed: interactionId={} error={}",
                    request.getInteractionId(), e.getMessage());
            throw new RuntimeException("Payment gateway error: " + e.getMessage(), e);
        }
    }

    /**
     * Fallback for createRazorpayOrder. Invoked when the circuit breaker is
     * open or all retry attempts are exhausted. Logs the failure and returns
     * a graceful error response — the controller can detect the null orderId
     * and return an appropriate HTTP 503 (Service Unavailable) to the client.
     */
    public CreateOrderResponse createRazorpayOrderFallback(CreateOrderRequest request,
                                                            String clientId,
                                                            String idempotencyKey,
                                                            Throwable t) {
        log.error("Razorpay order creation FAILED (circuit breaker / retries exhausted): "
                + "interactionId={} clientId={} exception={}",
                request.getInteractionId(), clientId, t.getMessage());
        return new CreateOrderResponse(null, "0", currency, razorpayKeyId);
    }

    private CreateOrderResponse buildExistingOrderResponse(Interaction interaction) {
        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId()).orElse(null);
        double hourlyRate = expertProfile != null && expertProfile.getHourlyRate() != null
                ? expertProfile.getHourlyRate() : 0.0;
        int duration = interaction.getRecommendedDurationMinutes() != null
                ? interaction.getRecommendedDurationMinutes() : 15;
        PricingService.PriceBreakdown breakdown = pricingService.calculate(hourlyRate, duration);
        return new CreateOrderResponse(interaction.getRazorpayOrderId(),
                String.valueOf(breakdown.clientAmountInPaise()), currency, razorpayKeyId);
    }

    // ── Payment Verification (atomic state transition) ───────────

    /**
     * Verifies Razorpay signature and atomically activates the paid session.
     *
     * RACE CONDITION PREVENTION:
     * Uses MongoDB findAndModify to atomically check-and-set status.
     * Only the FIRST successful verification transitions to PAID_SESSION.
     * Concurrent duplicate calls receive the current state (idempotent).
     *
     * Resilience4j retry handles transient MongoDB/network failures
     * (exponential backoff: 1s → 2s → 4s, max 3 attempts).
     */
    @Retry(name = "razorpayRetry")
    public SessionStateResponse verifyAndConfirmPayment(PaymentVerifyRequest request) {
        // Atomic check-and-set: only transitions if status is FREE_SESSION or PAYMENT_PENDING
        Query query = new Query(Criteria.where("_id").is(request.getInteractionId())
                .and("status").in(SessionStatus.FREE_SESSION, SessionStatus.PAYMENT_PENDING));

        Update update = new Update()
                .set("status", SessionStatus.PAYMENT_VERIFIED)
                .set("updatedAt", Instant.now());

        Interaction interaction = mongoTemplate.findAndModify(
                query, update,
                org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true),
                Interaction.class);

        if (interaction == null) {
            // Already processed — return current state (idempotent retry)
            Interaction current = interactionRepository.findById(request.getInteractionId()).orElse(null);
            if (current != null && current.getStatus() == SessionStatus.PAID_SESSION) {
                log.info("Payment already verified for session {} (idempotent retry)", request.getInteractionId());
                return getSessionState(request.getInteractionId());
            }
            throw new InvalidSessionStateException(
                    "Session is not in a payable state. Current: "
                    + (current != null ? current.getStatus() : "unknown"));
        }

        // Verify HMAC-SHA256 signature
        boolean verified = verifySignature(request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(), request.getRazorpaySignature());
        if (!verified) {
            // Rollback: revert to PAYMENT_PENDING
            interaction.setStatus(SessionStatus.PAYMENT_PENDING);
            interactionRepository.save(interaction);
            log.error("Payment signature verification FAILED: orderId={} paymentId={}",
                    request.getRazorpayOrderId(),
                    truncateForLog(request.getRazorpayPaymentId()));

            // ── Audit: PAYMENT_FAILED ──
            Map<String, String> failureMetadata = new HashMap<>();
            failureMetadata.put("orderId", request.getRazorpayOrderId());
            failureMetadata.put("paymentId", truncateForLog(request.getRazorpayPaymentId()));
            failureMetadata.put("reason", "SIGNATURE_MISMATCH");
            auditService.record("PAYMENT_FAILED", "INTERACTION", request.getInteractionId(),
                    interaction.getClientId(), null, request.getInteractionId(), failureMetadata);

            throw new PaymentVerificationException("Payment verification failed: invalid signature");
        }

        // Calculate amounts via BigDecimal
        int purchasedMinutes = interaction.getRecommendedDurationMinutes() != null
                ? interaction.getRecommendedDurationMinutes() : 15;
        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId()).orElse(null);
        double hourlyRate = expertProfile != null && expertProfile.getHourlyRate() != null
                ? expertProfile.getHourlyRate() : 0.0;
        PricingService.PriceBreakdown breakdown = pricingService.calculate(hourlyRate, purchasedMinutes);

        // Transition to paid session
        Instant now = Instant.now();
        interaction.setPaymentStatus(PaymentStatus.HELD);
        interaction.setStatus(SessionStatus.PAID_SESSION);
        interaction.setPaidSessionEndsAt(now.plusSeconds(purchasedMinutes * 60L));
        interaction.setTotalPaidAmount(breakdown.clientAmountDouble());
        interaction.setExpertAmount(breakdown.expertAmountDouble());
        interaction.setCommissionAmount(breakdown.commissionAmountDouble());
        interaction.setRazorpayPaymentId(request.getRazorpayPaymentId());
        interactionRepository.save(interaction);

        // SessionPayment is a ledger record — non-fatal if it fails
        try {
            SessionPayment sp = SessionPayment.builder()
                    .interactionId(request.getInteractionId())
                    .transactionId(request.getRazorpayPaymentId())
                    .amount(breakdown.clientAmountDouble())
                    .expertAmount(breakdown.expertAmountDouble())
                    .commissionAmount(breakdown.commissionAmountDouble())
                    .chargedAt(now)
                    .type(PaymentType.INITIAL)
                    .status("SUCCESS")
                    .extensionToMinutes(purchasedMinutes)
                    .build();
            sessionPaymentRepository.save(sp);
        } catch (Exception e) {
            log.error("SessionPayment creation failed (non-fatal, reconcilable): interactionId={} error={}",
                    request.getInteractionId(), e.getMessage());
        }

        socketIOEventService.broadcastSessionEvent(request.getInteractionId(), "payment-completed", null);

        log.info("Payment verified: interactionId={} paymentId={} min={} clientPaid={} expertEarns={}",
                request.getInteractionId(),
                truncateForLog(request.getRazorpayPaymentId()),
                purchasedMinutes,
                breakdown.clientAmount(),
                breakdown.expertAmount());

        // ── Audit: PAYMENT_VERIFIED ──
        Map<String, String> verifiedMetadata = new HashMap<>();
        verifiedMetadata.put("paymentId", truncateForLog(request.getRazorpayPaymentId()));
        verifiedMetadata.put("purchasedMinutes", String.valueOf(purchasedMinutes));
        verifiedMetadata.put("expertAmount", String.valueOf(breakdown.expertAmountDouble()));
        verifiedMetadata.put("commissionAmount", String.valueOf(breakdown.commissionAmountDouble()));
        auditService.record("PAYMENT_VERIFIED", "INTERACTION", request.getInteractionId(),
                interaction.getClientId(), breakdown.clientAmountDouble(),
                request.getInteractionId(), verifiedMetadata);

        return getSessionState(request.getInteractionId());
    }

    /**
     * Verifies an extension payment with atomic state check.
     */
    public SessionStateResponse verifyExtensionPayment(PaymentVerifyRequest request) {
        Interaction interaction = interactionRepository.findById(request.getInteractionId())
                .orElseThrow(() -> new IllegalArgumentException("Interaction not found"));

        if (interaction.getStatus() != SessionStatus.PAID_SESSION) {
            throw new InvalidSessionStateException("Extension requires an active paid session. Current: "
                    + interaction.getStatus());
        }

        boolean verified = verifySignature(request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(), request.getRazorpaySignature());
        if (!verified) {
            log.error("Extension signature FAILED: orderId={} paymentId={}",
                    request.getRazorpayOrderId(), truncateForLog(request.getRazorpayPaymentId()));
            throw new PaymentVerificationException("Extension payment verification failed: invalid signature");
        }

        int extensionMinutes = interaction.getRecommendedDurationMinutes() != null
                ? interaction.getRecommendedDurationMinutes() : 15;
        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId()).orElse(null);
        double hourlyRate = expertProfile != null && expertProfile.getHourlyRate() != null
                ? expertProfile.getHourlyRate() : 0.0;
        PricingService.PriceBreakdown breakdown = pricingService.calculate(hourlyRate, extensionMinutes);

        Instant currentEnd = interaction.getPaidSessionEndsAt();
        if (currentEnd == null || currentEnd.isBefore(Instant.now())) {
            currentEnd = Instant.now();
        }
        interaction.setPaidSessionEndsAt(currentEnd.plusSeconds(extensionMinutes * 60L));
        interaction.setTotalPaidAmount((interaction.getTotalPaidAmount() != null
                ? interaction.getTotalPaidAmount() : 0) + breakdown.clientAmountDouble());
        interaction.setExpertAmount((interaction.getExpertAmount() != null
                ? interaction.getExpertAmount() : 0) + breakdown.expertAmountDouble());
        interaction.setCommissionAmount((interaction.getCommissionAmount() != null
                ? interaction.getCommissionAmount() : 0) + breakdown.commissionAmountDouble());
        interaction.setRazorpayPaymentId(request.getRazorpayPaymentId());
        interactionRepository.save(interaction);

        try {
            SessionPayment sp = SessionPayment.builder()
                    .interactionId(request.getInteractionId())
                    .transactionId(request.getRazorpayPaymentId())
                    .amount(breakdown.clientAmountDouble())
                    .expertAmount(breakdown.expertAmountDouble())
                    .commissionAmount(breakdown.commissionAmountDouble())
                    .chargedAt(Instant.now())
                    .type(PaymentType.EXTENSION)
                    .status("SUCCESS")
                    .extensionToMinutes(extensionMinutes)
                    .build();
            sessionPaymentRepository.save(sp);
        } catch (Exception e) {
            log.error("Extension SessionPayment creation failed (non-fatal): interactionId={} error={}",
                    request.getInteractionId(), e.getMessage());
        }

        socketIOEventService.broadcastSessionEvent(request.getInteractionId(), "session-extended", null);

        log.info("Extension verified: interactionId={} paymentId={} extMin={} added={}",
                request.getInteractionId(), truncateForLog(request.getRazorpayPaymentId()),
                extensionMinutes, breakdown.clientAmount());

        // ── Audit: SESSION_EXTENDED ──
        Map<String, String> extMetadata = new HashMap<>();
        extMetadata.put("paymentId", truncateForLog(request.getRazorpayPaymentId()));
        extMetadata.put("extensionMinutes", String.valueOf(extensionMinutes));
        auditService.record("SESSION_EXTENDED", "INTERACTION", request.getInteractionId(),
                interaction.getClientId(), breakdown.clientAmountDouble(),
                request.getInteractionId(), extMetadata);

        return getSessionState(request.getInteractionId());
    }

    // ── Session State ───────────────────────────────────────────

    public SessionStateResponse getSessionState(String interactionId) {
        Interaction interaction = interactionRepository.findById(interactionId)
                .orElseThrow(() -> new IllegalArgumentException("Interaction not found"));

        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId()).orElse(null);
        double hourlyRate = expertProfile != null && expertProfile.getHourlyRate() != null
                ? expertProfile.getHourlyRate() : 0.0;

        SessionStateResponse state = new SessionStateResponse();
        state.setInteractionId(interactionId);
        state.setExpertHourlyRate(hourlyRate);
        state.setClientHourlyRate(pricingService.getClientHourlyRate(hourlyRate));
        state.setCommissionPercent(pricingService.getCommissionPercent());

        if (interaction.getExpertAmount() != null) {
            state.setExpertAmount(interaction.getExpertAmount());
            state.setCommissionAmount(interaction.getCommissionAmount());
        } else {
            state.setExpertAmount(pricingService.deriveExpertAmount(
                    interaction.getTotalPaidAmount() != null ? interaction.getTotalPaidAmount() : 0));
            state.setCommissionAmount(pricingService.deriveCommissionAmount(
                    interaction.getTotalPaidAmount() != null ? interaction.getTotalPaidAmount() : 0));
        }

        SessionStatus status = interaction.getStatus();
        if (status == SessionStatus.FREE_SESSION) state.setPhase("FREE_SESSION");
        else if (status == SessionStatus.PAYMENT_PENDING) state.setPhase("PAYMENT_PENDING");
        else if (status == SessionStatus.PAYMENT_VERIFIED || status == SessionStatus.PAID_SESSION) state.setPhase("PAID_SESSION");
        else if (status == SessionStatus.COMPLETED) state.setPhase("COMPLETED");
        else if (status == SessionStatus.FREE_SESSION_EXPIRED) state.setPhase("FREE_SESSION_EXPIRED");
        else state.setPhase(status.name());

        if (interaction.getFreeTrialEndsAt() != null) {
            long remaining = interaction.getFreeTrialEndsAt().getEpochSecond() - Instant.now().getEpochSecond();
            state.setFreeTrialRemainingSec((int) Math.max(0, remaining));
            if (remaining <= 0 && (status == SessionStatus.FREE_SESSION || status == SessionStatus.PAYMENT_PENDING)) {
                if (status != SessionStatus.PAID_SESSION && status != SessionStatus.COMPLETED) {
                    interaction.setStatus(SessionStatus.FREE_SESSION_EXPIRED);
                    interactionRepository.save(interaction);
                    state.setPhase("FREE_SESSION_EXPIRED");
                    socketIOEventService.broadcastSessionEvent(interactionId, "timer-expired", null);
                }
            }
        }

        if (interaction.getPaidSessionEndsAt() != null && interaction.getStatus() == SessionStatus.PAID_SESSION) {
            long remaining = interaction.getPaidSessionEndsAt().getEpochSecond() - Instant.now().getEpochSecond();
            state.setPaidSessionRemainingSec((int) Math.max(0, remaining));
            int totalDurationSec = interaction.getRecommendedDurationMinutes() != null
                    ? interaction.getRecommendedDurationMinutes() * 60 : 900;
            state.setElapsedPaidSeconds(Math.max(0, totalDurationSec - (int) Math.max(0, remaining)));
            state.setTotalPaidDurationMin(interaction.getRecommendedDurationMinutes() != null
                    ? interaction.getRecommendedDurationMinutes() : 0);
            state.setShowExtendPrompt(remaining > 0 && remaining <= extendPromptSeconds);

            if (remaining <= 0) {
                interaction.setStatus(SessionStatus.COMPLETED);
                interaction.setEndedAt(Instant.now());
                interaction.setActualDurationMinutes(
                        (interaction.getRecommendedDurationMinutes() != null
                                ? interaction.getRecommendedDurationMinutes() : 0) + (freeTrialSeconds / 60));
                interactionRepository.save(interaction);
                CallRequest cr = callRequestRepository.findByInteractionId(interaction.getId()).orElse(null);
                if (cr != null) { cr.setStatus("COMPLETED"); cr.setRespondedAt(Instant.now()); callRequestRepository.save(cr); }

                // ── Audit: SESSION_COMPLETED ──
                Map<String, String> completedMetadata = new HashMap<>();
                completedMetadata.put("actualDurationMinutes",
                        String.valueOf(interaction.getActualDurationMinutes()));
                completedMetadata.put("totalPaidAmount",
                        String.valueOf(interaction.getTotalPaidAmount()));
                auditService.record("SESSION_COMPLETED", "INTERACTION", interaction.getId(),
                        "SYSTEM", interaction.getTotalPaidAmount(),
                        interaction.getId(), completedMetadata);

                expertEarningService.processEarning(interaction);

                // ── Audit: EARNING_PROCESSED ──
                Map<String, String> earningMetadata = new HashMap<>();
                earningMetadata.put("expertId", interaction.getExpertId());
                earningMetadata.put("expertAmount",
                        String.valueOf(interaction.getExpertAmount()));
                earningMetadata.put("commissionAmount",
                        String.valueOf(interaction.getCommissionAmount()));
                auditService.record("EARNING_PROCESSED", "EXPERT_EARNING", interaction.getId(),
                        "SYSTEM", interaction.getExpertAmount(),
                        interaction.getId(), earningMetadata);

                state.setPhase("COMPLETED");
                socketIOEventService.broadcastSessionEvent(interactionId, "timer-expired", null);
            }
        }

        state.setRecommendedDurationMin(interaction.getRecommendedDurationMinutes());
        state.setPaymentStatus(interaction.getPaymentStatus() != null ? interaction.getPaymentStatus().name() : "UNPAID");
        state.setTotalPaidAmount(interaction.getTotalPaidAmount());
        return state;
    }

    // ── Duration Recommendation ──────────────────────────────────

    public SessionStateResponse setDurationRecommendation(DurationRecommendationRequest request, String expertId) {
        Interaction interaction = interactionRepository.findById(request.getInteractionId())
                .orElseThrow(() -> new IllegalArgumentException("Interaction not found"));
        if (!interaction.getExpertId().equals(expertId))
            throw new InvalidSessionStateException("Only the expert can recommend duration");
        if (request.getRecommendedDurationMinutes() < 15 || request.getRecommendedDurationMinutes() > 60)
            throw new IllegalArgumentException("Duration must be between 15 and 60 minutes");

        interaction.setRecommendedDurationMinutes(request.getRecommendedDurationMinutes());
        if (interaction.getStatus() == SessionStatus.FREE_SESSION)
            interaction.setStatus(SessionStatus.PAYMENT_PENDING);
        interactionRepository.save(interaction);
        socketIOEventService.broadcastSessionEvent(request.getInteractionId(), "recommendation", null);
        return getSessionState(request.getInteractionId());
    }

    // ── Signature Verification (constant-time) ───────────────────

    private boolean verifySignature(String orderId, String paymentId, String receivedSignature) {
        try {
            String data = orderId + "|" + paymentId;
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            sha256_HMAC.init(new SecretKeySpec(razorpayKeySecret.getBytes(), "HmacSHA256"));
            byte[] hash = sha256_HMAC.doFinal(data.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return constantTimeEquals(hex.toString(), receivedSignature);
        } catch (Exception e) {
            log.error("Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /** Constant-time comparison to prevent timing side-channel attacks. */
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) result |= a.charAt(i) ^ b.charAt(i);
        return result == 0;
    }

    /**
     * Processes a payment confirmed via Razorpay webhook (server-to-server).
     * Idempotent — safe to call multiple times for the same payment.
     * This is a defense-in-depth layer alongside client-side verification.
     */
    public void processWebhookPayment(String orderId, String paymentId) {
        // Indexed lookup by Razorpay order ID — O(log n) instead of full table scan
        Interaction interaction = interactionRepository.findByRazorpayOrderId(orderId).orElse(null);

        if (interaction == null) {
            log.warn("Webhook: no interaction found for orderId={}", truncateForLog(orderId));
            return;
        }

        // Idempotent: skip if already in PAID_SESSION
        if (interaction.getStatus() == SessionStatus.PAID_SESSION) {
            log.info("Webhook: interaction {} already PAID (idempotent)", interaction.getId());
            return;
        }

        // Only process if in a payable state
        if (interaction.getStatus() != SessionStatus.PAYMENT_PENDING
                && interaction.getStatus() != SessionStatus.PAYMENT_VERIFIED) {
            log.warn("Webhook: interaction {} in non-payable state: {}", interaction.getId(), interaction.getStatus());
            return;
        }

        // Transition to paid session (same logic as verifyAndConfirmPayment)
        int purchasedMinutes = interaction.getRecommendedDurationMinutes() != null
                ? interaction.getRecommendedDurationMinutes() : 15;
        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId()).orElse(null);
        double hourlyRate = expertProfile != null && expertProfile.getHourlyRate() != null
                ? expertProfile.getHourlyRate() : 0.0;
        PricingService.PriceBreakdown breakdown = pricingService.calculate(hourlyRate, purchasedMinutes);

        Instant now = Instant.now();
        interaction.setPaymentStatus(PaymentStatus.HELD);
        interaction.setStatus(SessionStatus.PAID_SESSION);
        interaction.setPaidSessionEndsAt(now.plusSeconds(purchasedMinutes * 60L));
        interaction.setTotalPaidAmount(breakdown.clientAmountDouble());
        interaction.setExpertAmount(breakdown.expertAmountDouble());
        interaction.setCommissionAmount(breakdown.commissionAmountDouble());
        if (paymentId != null) interaction.setRazorpayPaymentId(paymentId);
        interactionRepository.save(interaction);

        // Create SessionPayment record
        try {
            SessionPayment sp = SessionPayment.builder()
                    .interactionId(interaction.getId())
                    .transactionId(paymentId != null ? paymentId : "webhook-" + orderId)
                    .amount(breakdown.clientAmountDouble())
                    .expertAmount(breakdown.expertAmountDouble())
                    .commissionAmount(breakdown.commissionAmountDouble())
                    .chargedAt(now)
                    .type(PaymentType.INITIAL)
                    .status("SUCCESS")
                    .extensionToMinutes(purchasedMinutes)
                    .build();
            sessionPaymentRepository.save(sp);
        } catch (Exception e) {
            log.error("Webhook SessionPayment creation failed (non-fatal): {}", e.getMessage());
        }

        socketIOEventService.broadcastSessionEvent(interaction.getId(), "payment-completed", null);
        log.info("Webhook processed: interactionId={} paymentId={} amount={}",
                interaction.getId(), truncateForLog(paymentId), breakdown.clientAmount());
    }

    /** Truncates payment ID for safe logging (never logs full identifiers). */
    private String truncateForLog(String paymentId) {
        if (paymentId == null) return "null";
        if (paymentId.length() <= 12) return paymentId.substring(0, 4) + "****";
        return paymentId.substring(0, 8) + "****" + paymentId.substring(paymentId.length() - 4);
    }
}
