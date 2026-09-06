package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Runtime-tunable platform settings, persisted as a single "global" document.
 * Overrides the property-file defaults so admins can adjust commission,
 * settlement windows and payout rules without a redeploy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "platform_settings")
public class PlatformSettings {

    public static final String GLOBAL_ID = "global";

    @Id
    private String id;

    /** Platform commission percent applied on top of expert rates. */
    private Double commissionPercent;

    /** Window (minutes) clients have to dispute/refund before settlement. */
    private Integer settlementPeriodMinutes;

    /** Minimum amount an expert must accumulate before a payout is eligible. */
    private Double payoutMinAmount;

    /** Payout provider key (manual, razorpay_payouts, ...). */
    private String payoutProvider;

    /** Master toggle for the settlement worker. */
    private Boolean settlementEnabled;

    /** Master toggle for the payout worker. */
    private Boolean payoutEnabled;

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
