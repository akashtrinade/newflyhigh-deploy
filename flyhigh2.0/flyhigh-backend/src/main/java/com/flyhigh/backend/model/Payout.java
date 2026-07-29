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
@Document(collection = "payouts")
public class Payout {

    @Id
    private String id;

    @Indexed
    private String expertId;

    private Integer totalMinutes; // Aggregated duration
    private Double payoutAmount;   // Final amount calculated

    // Idempotency key to prevent double payments (Format: expertId_YYYY-MM-DD)
    @Indexed(unique = true)
    private String idempotencyKey;

    private Instant processedAt;

    private PayoutStatus status; // Enum: PROCESSED, FAILED

    private String gatewayReferenceId; // Reference from UPI, Bank, or Wallet API
    private String errorMessage;
}
