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

    private Instant createdAt;

    private Instant updatedAt;
}
