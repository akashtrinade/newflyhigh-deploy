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
 * Represents a refund issued against a client payment.
 * Refunds can originate from an admin-approved dispute or
 * be initiated directly by admin.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "refunds")
public class Refund {

    @Id
    private String id;

    @Indexed
    private String interactionId;       // The session being refunded

    @Indexed
    private String paymentId;           // Razorpay payment ID

    @Indexed
    private String disputeId;           // If refund originated from a dispute

    private Double refundAmount;        // Full or partial amount

    private String reason;              // Why the refund was issued

    private String approvedBy;          // Admin ID who approved

    private String razorpayRefundId;    // Provider reference after processing

    @Indexed
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING_APPROVAL;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant processedAt;
}
