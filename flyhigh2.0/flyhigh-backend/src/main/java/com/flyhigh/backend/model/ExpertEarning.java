package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Represents an expert's earnings from a completed paid consultation session.
 * Each earning is linked to one Interaction (and its SessionPayment).
 *
 * Commission formula:
 *   platformFee = clientPaidAmount * (platformCommissionPercent / 100)
 *   expertEarningAmount = clientPaidAmount - platformFee
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "expert_earnings")
public class ExpertEarning {

    @Id
    private String id;

    @Indexed
    private String expertId;

    @Indexed(unique = true)
    private String interactionId;

    private String sessionPaymentId;

    private Double clientPaidAmount;

    private Double platformCommissionPercent;

    private Double platformFee;

    private Double expertEarningAmount;

    @Indexed
    private EarningStatus status;

    // ── Settlement fields ──
    private Instant settlementStartTime;    // paid session completion time
    private Instant settlementEndTime;      // settlementStartTime + configured period (default 24h)
    private Instant settledAt;              // when settlement actually completed
    private int settlementAttempts;         // number of settlement attempts; reset on success
    private String settlementBlockReason;   // why settlement is blocked (null = not blocked)

    // ── Payout linkage ──
    private String payoutId;                // links to Payout document
    private String payoutStatus;            // NOT_ELIGIBLE, ELIGIBLE, PROCESSING, SUCCESS, FAILED, RETRYING

    // ── Dispute / Refund blocking flags ──
    private String refundStatus;            // null, PARTIAL, FULL
    private String disputeStatus;           // null, DISPUTED, RESOLVED

    private Instant createdAt;

    private Instant updatedAt;
}
