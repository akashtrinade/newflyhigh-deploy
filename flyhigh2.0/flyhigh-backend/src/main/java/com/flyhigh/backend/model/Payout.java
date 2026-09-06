package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

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

    private List<String> earningIds;   // Linked ExpertEarning ids bundled in this payout

    private Integer totalMinutes; // Aggregated duration
    private Double payoutAmount;   // Final amount calculated

    // Idempotency key to prevent double payments (Format: WD:<uuid> or EXP:<earningId>)
    @Indexed(unique = true)
    private String idempotencyKey;

    // Bank / UPI destination snapshot at request time (manual payout flow)
    private String accountHolderName;
    private String accountNumber;
    private String ifsc;
    private String upiId;

    // ── RazorpayX gateway linkage (automatic payout flow) ──
    @Indexed
    private String gatewayPayoutId;      // RazorpayX payout id (pout_...) — webhook/reconcile lookup key
    private String gatewayFundAccountId; // RazorpayX fund account id (fa_...)
    private String gatewayContactId;     // RazorpayX contact id (cont_...)
    private String mode;                 // UPI | IMPS | NEFT — chosen at gateway create time

    private Instant createdAt;
    private Instant processedAt;

    private PayoutStatus status; // Enum: NOT_ELIGIBLE, ELIGIBLE, PROCESSING, SUCCESS, FAILED, RETRYING

    private String gatewayReferenceId; // Reference from UPI, Bank, or Wallet API
    private String errorMessage;
    private Integer retryCount;        // Number of retry attempts
    private Instant lastRetryAt;       // When last retry was attempted
}
