package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "interactions")
public class Interaction {

    @Id
    private String id;

    @Indexed
    private String clientId; // User ID of Client

    @Indexed
    private String expertId; // User ID of Expert

    // Immutable snapshot of the rate at the time of booking
    private Double rateSnapshot;

    private Instant startedAt;
    private Instant endedAt;

    private Integer scheduledDurationMinutes; // Starts at 15; extends to 30, 45, or 60.
    private Integer actualDurationMinutes;    // Total elapsed time logged upon completion

    @Indexed
    private SessionStatus status; // Enum: CREATED, ACTIVE, COMPLETED, CANCELLED

    @Indexed
    private PaymentStatus paymentStatus; // Enum: UNPAID, PAID (used for expert payout calculations)

    private String payoutId; // Assigned when processed by the cron job

    // ── Payment / session management ──
    private Integer recommendedDurationMinutes;  // Expert's recommendation (15, 30, 45, 60)
    private Instant freeTrialEndsAt;             // When 5-min free trial expires
    private Instant paidSessionEndsAt;           // When paid session expires
    private Double totalPaidAmount;              // Total amount paid by client (INR) = expertAmount + commissionAmount
    private Double expertAmount;                 // Expert's base earning for this session (INR)
    private Double commissionAmount;             // Platform commission for this session (INR)
    @org.springframework.data.mongodb.core.index.Indexed
    private String razorpayOrderId;              // Current active Razorpay order ID
    private String razorpayPaymentId;            // Completed Razorpay payment ID
    private String idempotencyKey;               // Client-generated idempotency key to prevent duplicate orders

    // --- Seed metadata ---
    private Boolean isSeedData;
    private String seedSource;
}