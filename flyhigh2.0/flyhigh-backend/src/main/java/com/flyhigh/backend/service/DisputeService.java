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

/**
 * Manages the full dispute lifecycle: client raises → earning blocked →
 * admin reviews → decision (Accept/Reject/RequestInfo/Escalate) → resolution.
 */
@Service
public class DisputeService {

    private static final Logger log = LoggerFactory.getLogger(DisputeService.class);

    private final DisputeRepository disputeRepository;
    private final ExpertEarningRepository expertEarningRepository;
    private final InteractionRepository interactionRepository;
    private final AuditService auditService;

    public DisputeService(DisputeRepository disputeRepository,
                          ExpertEarningRepository expertEarningRepository,
                          InteractionRepository interactionRepository,
                          AuditService auditService) {
        this.disputeRepository = disputeRepository;
        this.expertEarningRepository = expertEarningRepository;
        this.interactionRepository = interactionRepository;
        this.auditService = auditService;
    }

    /**
     * Client raises a dispute against a completed session.
     */
    public Dispute createDispute(String interactionId, String clientId,
                                  String reason, String statement) {
        // Verify interaction exists and belongs to client
        Interaction interaction = interactionRepository.findById(interactionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + interactionId));

        if (!clientId.equals(interaction.getClientId())) {
            throw new SecurityException("Not authorized to dispute this session");
        }

        if (interaction.getStatus() != SessionStatus.COMPLETED) {
            throw new IllegalStateException("Can only dispute completed sessions");
        }

        // Check for existing open dispute
        List<Dispute> existing = disputeRepository.findByInteractionId(interactionId);
        if (existing != null) {
            for (Dispute d : existing) {
                if (d.getStatus() != DisputeStatus.RESOLVED &&
                        d.getStatus() != DisputeStatus.REJECTED) {
                    throw new IllegalStateException("An active dispute already exists for this session");
                }
            }
        }

        // Block the associated earning
        ExpertEarning earning = expertEarningRepository.findByInteractionId(interactionId).orElse(null);
        String earningId = earning != null ? earning.getId() : null;

        if (earning != null) {
            earning.setDisputeStatus("DISPUTED");
            earning.setUpdatedAt(Instant.now());
            expertEarningRepository.save(earning);
        }

        // Create dispute
        Dispute dispute = Dispute.builder()
                .interactionId(interactionId)
                .clientId(clientId)
                .expertId(interaction.getExpertId())
                .earningId(earningId)
                .reason(reason)
                .clientStatement(statement)
                .status(DisputeStatus.OPEN)
                .build();

        dispute = disputeRepository.save(dispute);

        auditService.record("DISPUTE_OPENED", "DISPUTE",
                dispute.getId(), clientId, null,
                interactionId,
                Map.of("reason", reason, "earningId", earningId != null ? earningId : ""));

        log.info("Dispute opened: disputeId={} interactionId={} clientId={}",
                dispute.getId(), interactionId, clientId);
        return dispute;
    }

    /**
     * Admin reviews a dispute and makes a decision.
     */
    public Dispute adminDecide(String disputeId, String decision, String adminId,
                                String decisionReason) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found: " + disputeId));

        DisputeStatus newStatus;
        switch (decision.toUpperCase()) {
            case "ACCEPT":
                newStatus = DisputeStatus.ACCEPTED;
                break;
            case "REJECT":
                newStatus = DisputeStatus.REJECTED;
                // Unblock earning — settlement/payout can proceed
                unblockEarning(dispute);
                break;
            case "REQUEST_INFO":
                newStatus = DisputeStatus.INFO_REQUESTED;
                break;
            case "ESCALATE":
                newStatus = DisputeStatus.ESCALATED;
                break;
            default:
                throw new IllegalArgumentException("Invalid decision: " + decision);
        }

        dispute.setStatus(newStatus);
        dispute.setAdminId(adminId);
        dispute.setDecision(decision);
        dispute.setDecisionReason(decisionReason);
        dispute.setUpdatedAt(Instant.now());

        if (newStatus == DisputeStatus.ACCEPTED || newStatus == DisputeStatus.REJECTED) {
            dispute.setResolvedAt(Instant.now());
            // Clear dispute blocking on earning for REJECTED
            if (newStatus == DisputeStatus.REJECTED) {
                clearEarningDispute(dispute);
            }
        }

        dispute = disputeRepository.save(dispute);

        auditService.record("DISPUTE_DECISION", "DISPUTE",
                dispute.getId(), adminId, null,
                dispute.getInteractionId(),
                Map.of("decision", decision, "reason", decisionReason != null ? decisionReason : ""));

        log.info("Dispute decided: disputeId={} decision={} by={}",
                disputeId, decision, adminId);
        return dispute;
    }

    /**
     * Expert adds a response to the dispute.
     */
    public Dispute addExpertResponse(String disputeId, String expertId, String response) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found: " + disputeId));

        if (!expertId.equals(dispute.getExpertId())) {
            throw new SecurityException("Not authorized to respond to this dispute");
        }

        dispute.setExpertResponse(response);
        dispute.setUpdatedAt(Instant.now());

        // If admin requested info, move back to UNDER_REVIEW
        if (dispute.getStatus() == DisputeStatus.INFO_REQUESTED) {
            dispute.setStatus(DisputeStatus.UNDER_REVIEW);
        }

        return disputeRepository.save(dispute);
    }

    // ── Admin listing ──

    public Page<Dispute> getAdminQueue(int page, DisputeStatus statusFilter) {
        Sort sort = Sort.by(Sort.Direction.ASC, "createdAt");
        PageRequest pageable = PageRequest.of(page, 20, sort);

        if (statusFilter != null) {
            return disputeRepository.findByStatusOrderByCreatedAtAsc(statusFilter, pageable);
        }
        return disputeRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    // ── Client access ──

    public List<Dispute> getClientDisputes(String clientId) {
        return disputeRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    public Dispute getDispute(String disputeId) {
        return disputeRepository.findById(disputeId)
                .orElseThrow(() -> new IllegalArgumentException("Dispute not found: " + disputeId));
    }

    // ── Helpers ──

    private void unblockEarning(Dispute dispute) {
        if (dispute.getEarningId() != null) {
            ExpertEarning earning = expertEarningRepository.findById(dispute.getEarningId()).orElse(null);
            if (earning != null) {
                earning.setDisputeStatus("RESOLVED");
                earning.setUpdatedAt(Instant.now());
                expertEarningRepository.save(earning);
            }
        }
    }

    private void clearEarningDispute(Dispute dispute) {
        if (dispute.getEarningId() != null) {
            ExpertEarning earning = expertEarningRepository.findById(dispute.getEarningId()).orElse(null);
            if (earning != null) {
                earning.setDisputeStatus(null);
                earning.setUpdatedAt(Instant.now());
                expertEarningRepository.save(earning);
            }
        }
    }
}
