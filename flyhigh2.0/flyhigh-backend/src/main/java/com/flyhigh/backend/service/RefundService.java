package com.flyhigh.backend.service;

import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Manages refund lifecycle: request → admin approval → processing → completion.
 * Refunds can originate from dispute resolution or be admin-initiated.
 */
@Service
public class RefundService {

    private static final Logger log = LoggerFactory.getLogger(RefundService.class);

    private final RefundRepository refundRepository;
    private final InteractionRepository interactionRepository;
    private final ExpertEarningRepository expertEarningRepository;
    private final AuditService auditService;

    public RefundService(RefundRepository refundRepository,
                         InteractionRepository interactionRepository,
                         ExpertEarningRepository expertEarningRepository,
                         AuditService auditService) {
        this.refundRepository = refundRepository;
        this.interactionRepository = interactionRepository;
        this.expertEarningRepository = expertEarningRepository;
        this.auditService = auditService;
    }

    /**
     * Client-initiated refund request. Verifies the requester owns the session
     * before creating the refund (prevents IDOR on arbitrary interactionIds).
     */
    public Refund requestClientRefund(String interactionId, String clientId, String reason) {
        Interaction interaction = interactionRepository.findById(interactionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + interactionId));

        if (clientId == null || !clientId.equals(interaction.getClientId())) {
            throw new SecurityException("Not authorized to request a refund for this session");
        }

        return createRefund(interaction, interaction.getTotalPaidAmount(), reason, null, null);
    }

    /**
     * Creates a refund request (admin-initiated or from accepted dispute).
     */
    public Refund requestRefund(String interactionId, Double amount, String reason,
                                 String adminId, String disputeId) {
        Interaction interaction = interactionRepository.findById(interactionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + interactionId));

        return createRefund(interaction, amount, reason, adminId, disputeId);
    }

    private Refund createRefund(Interaction interaction, Double amount, String reason,
                                 String approvedBy, String disputeId) {
        String interactionId = interaction.getId();

        if (interaction.getPaymentStatus() != PaymentStatus.HELD &&
                interaction.getPaymentStatus() != PaymentStatus.PAID) {
            throw new IllegalStateException("Cannot refund: payment status is " + interaction.getPaymentStatus());
        }

        // Refunds are only eligible after the session has actually completed —
        // a client cannot request a refund while the consultation is still running.
        if (interaction.getStatus() != SessionStatus.COMPLETED) {
            throw new IllegalStateException("Cannot refund: session is not completed (current: "
                    + interaction.getStatus() + ")");
        }

        double paid = interaction.getTotalPaidAmount() != null ? interaction.getTotalPaidAmount() : 0.0;
        double refundAmount = amount != null ? amount : paid;

        // Validate amount against the actual paid amount
        if (refundAmount <= 0) {
            throw new IllegalArgumentException("Refund amount must be positive");
        }
        if (refundAmount > paid) {
            throw new IllegalArgumentException("Refund amount cannot exceed the paid amount (" + paid + ")");
        }

        // Block duplicates — any non-terminal refund on the same session
        List<Refund> existing = refundRepository.findByInteractionId(interactionId);
        if (existing != null) {
            for (Refund r : existing) {
                if (r.getStatus() != RefundStatus.FAILED) {
                    throw new IllegalStateException("A refund request already exists for this session");
                }
            }
        }

        Refund refund = Refund.builder()
                .interactionId(interactionId)
                .paymentId(interaction.getRazorpayPaymentId())
                .disputeId(disputeId)
                .refundAmount(refundAmount)
                .reason(reason)
                .approvedBy(approvedBy)
                .status(RefundStatus.PENDING_APPROVAL)
                .build();

        refund = refundRepository.save(refund);

        auditService.record("REFUND_REQUESTED", "REFUND",
                refund.getId(), approvedBy, refundAmount,
                interactionId,
                Map.of("reason", reason, "disputeId", disputeId != null ? disputeId : ""));

        log.info("Refund requested: refundId={} interactionId={} amount={}",
                refund.getId(), interactionId, refundAmount);
        return refund;
    }

    /**
     * Admin approves a refund and processes it.
     */
    public Refund approveAndProcess(String refundId, String adminId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund not found: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Refund is not in PENDING_APPROVAL state");
        }

        refund.setStatus(RefundStatus.APPROVED);
        refund.setApprovedBy(adminId);
        refundRepository.save(refund);

        // Process the refund
        return processRefund(refund);
    }

    /**
     * Processes an approved refund (marks as PROCESSING, then COMPLETED).
     * In production, this would call the Razorpay refund API.
     */
    private Refund processRefund(Refund refund) {
        refund.setStatus(RefundStatus.PROCESSING);
        refundRepository.save(refund);

        try {
            // In manual/mock mode: auto-complete
            String gatewayRefundId = "rfnd_" + UUID.randomUUID().toString().substring(0, 8);
            completeRefund(refund, gatewayRefundId);
        } catch (Exception e) {
            refund.setStatus(RefundStatus.FAILED);
            refundRepository.save(refund);
            log.error("Refund processing failed: refundId={} error={}", refund.getId(), e.getMessage());
        }

        return refund;
    }

    /**
     * Marks a refund as complete and updates related entities.
     */
    public void completeRefund(Refund refund, String razorpayRefundId) {
        Instant now = Instant.now();

        refund.setRazorpayRefundId(razorpayRefundId);
        refund.setStatus(RefundStatus.COMPLETED);
        refund.setProcessedAt(now);
        refundRepository.save(refund);

        // Mark interaction as REFUNDED
        Interaction interaction = interactionRepository.findById(refund.getInteractionId()).orElse(null);
        if (interaction != null) {
            interaction.setPaymentStatus(PaymentStatus.UNPAID);
            interaction.setStatus(SessionStatus.REFUNDED);
            interactionRepository.save(interaction);
        }

        // Adjust earning if it exists
        ExpertEarning earning = expertEarningRepository.findByInteractionId(refund.getInteractionId()).orElse(null);
        if (earning != null) {
            earning.setRefundStatus("FULL");
            earning.setStatus(EarningStatus.REFUND_ADJUSTED);
            earning.setUpdatedAt(now);
            expertEarningRepository.save(earning);
        }

        auditService.record("REFUND_COMPLETED", "REFUND",
                refund.getId(), refund.getApprovedBy(), refund.getRefundAmount(),
                refund.getInteractionId(),
                Map.of("gatewayRefundId", razorpayRefundId));

        log.info("Refund completed: refundId={} interactionId={} amount={} gatewayRef={}",
                refund.getId(), refund.getInteractionId(), refund.getRefundAmount(), razorpayRefundId);
    }

    /**
     * Rejects a refund request.
     */
    public Refund rejectRefund(String refundId, String adminId, String note) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund not found: " + refundId));

        refund.setStatus(RefundStatus.FAILED);
        refund.setReason((refund.getReason() != null ? refund.getReason() + " " : "") + "Rejected: " + note);
        refundRepository.save(refund);

        auditService.record("REFUND_REJECTED", "REFUND",
                refund.getId(), adminId, refund.getRefundAmount(),
                refund.getInteractionId(), Map.of("note", note));

        log.info("Refund rejected: refundId={} by={}", refundId, adminId);
        return refund;
    }

    /**
     * Creates a refund from an accepted dispute.
     */
    public Refund createRefundFromDispute(Dispute dispute, String adminId) {
        Interaction interaction = interactionRepository.findById(dispute.getInteractionId())
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        return requestRefund(
                dispute.getInteractionId(),
                interaction.getTotalPaidAmount(), // Full refund
                "Dispute accepted: " + (dispute.getDecisionReason() != null ? dispute.getDecisionReason() : dispute.getReason()),
                adminId,
                dispute.getId()
        );
    }

    /**
     * Creates a refund from an accepted dispute unless a non-FAILED refund
     * already exists for the interaction (e.g. the client requested one earlier).
     * Returns the existing refund in that case. Idempotent — safe to call on
     * every ACCEPT decision.
     */
    public Refund createRefundFromDisputeIfAbsent(Dispute dispute, String adminId) {
        List<Refund> existing = refundRepository.findByInteractionId(dispute.getInteractionId());
        if (existing != null) {
            for (Refund r : existing) {
                if (r.getStatus() != RefundStatus.FAILED) {
                    return r;
                }
            }
        }
        return createRefundFromDispute(dispute, adminId);
    }

    // ── Admin listing ──

    public Page<Refund> listRefunds(int page) {
        return refundRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, 20));
    }

    public Refund getRefund(String refundId) {
        return refundRepository.findById(refundId)
                .orElseThrow(() -> new IllegalArgumentException("Refund not found: " + refundId));
    }
}
