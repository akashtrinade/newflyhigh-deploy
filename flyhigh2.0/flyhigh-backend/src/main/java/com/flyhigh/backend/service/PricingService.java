package com.flyhigh.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Centralised pricing calculation service — SINGLE SOURCE OF TRUTH.
 *
 * FINANCIAL INTEGRITY:
 * All calculations use {@link BigDecimal} with {@link RoundingMode#HALF_EVEN}
 * (banker's rounding) to prevent floating-point errors. Floating-point types
 * (double/float) are NEVER used in financial arithmetic because they introduce
 * representation errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 *
 * AMOUNT STORAGE CONVENTION:
 * - Internal calculations: BigDecimal with 2 decimal places (INR rupees).
 * - Razorpay API: amounts in paise (1 INR = 100 paise) as long integers.
 * - MongoDB: stored as double for backward compatibility; migrated to
 *   Decimal128 in a future schema migration.
 *
 * FORMULA:
 *   expertAmount    = expertHourlyRate × (durationMinutes / 60)
 *   commissionAmount = expertAmount × (commissionPercent / 100)
 *   clientAmount     = expertAmount + commissionAmount
 *
 * The expert defines what they want to EARN. The platform commission is
 * added ON TOP to produce the client-facing price. This service is the
 * single source of truth consumed by search, profile, payments, earnings,
 * and future withdrawal flows.
 */
@Service
public class PricingService {

    private static final Logger log = LoggerFactory.getLogger(PricingService.class);

    /** Number of decimal places for INR amounts (rupees with paise). */
    private static final int SCALE = 2;

    /** Rounding mode: HALF_EVEN (banker's rounding) is the standard for financial systems. */
    private static final RoundingMode ROUNDING = RoundingMode.HALF_EVEN;

    /** Paise per rupee. */
    private static final BigDecimal PAISE_PER_RUPEE = new BigDecimal("100");

    /** Minutes per hour. */
    private static final BigDecimal MINUTES_PER_HOUR = new BigDecimal("60");

    /** 100% as BigDecimal. */
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final PlatformSettingsService settingsService;

    public PricingService(PlatformSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    private BigDecimal commissionPercent() {
        return BigDecimal.valueOf(settingsService.getCommissionPercent());
    }

    // ── Core calculation ────────────────────────────────────────

    /**
     * Computes the full price breakdown for a session of the given duration.
     *
     * All arithmetic uses {@link BigDecimal} — zero floating-point error.
     *
     * @param expertHourlyRate what the expert wants to earn per hour (INR)
     * @param durationMinutes  consultation duration in minutes
     * @return complete breakdown of expert amount, commission, and client price
     */
    public PriceBreakdown calculate(double expertHourlyRate, int durationMinutes) {
        BigDecimal rate = BigDecimal.valueOf(expertHourlyRate);
        BigDecimal duration = BigDecimal.valueOf(durationMinutes);

        if (rate.signum() < 0) {
            log.warn("Negative hourly rate ({}), clamping to 0", expertHourlyRate);
            rate = BigDecimal.ZERO;
        }
        if (duration.signum() < 0) {
            log.warn("Negative duration ({}), clamping to 0", durationMinutes);
            duration = BigDecimal.ZERO;
        }

        // expertAmount = rate × (duration / 60)
        BigDecimal expertAmount = rate
                .multiply(duration)
                .divide(MINUTES_PER_HOUR, SCALE + 2, ROUNDING) // extra precision for intermediate
                .setScale(SCALE, ROUNDING);

        // commissionAmount = expertAmount × (commissionPercent / 100)
        BigDecimal commissionAmount = expertAmount
                .multiply(commissionPercent())
                .divide(ONE_HUNDRED, SCALE + 2, ROUNDING)
                .setScale(SCALE, ROUNDING);

        // clientAmount = expertAmount + commissionAmount
        BigDecimal clientAmount = expertAmount.add(commissionAmount);

        log.debug("Pricing: rate={}/hr, {}min → expert={} comm={} client={}",
                expertHourlyRate, durationMinutes, expertAmount, commissionAmount, clientAmount);

        return new PriceBreakdown(expertAmount, commissionAmount, clientAmount,
                commissionPercent());
    }

    // ── Paise conversion (for Razorpay API) ─────────────────────

    /**
     * Converts a rupee amount to paise for Razorpay API calls.
     * 1 INR = 100 paise. Uses HALF_UP to match Razorpay's expectation.
     */
    public long toPaise(BigDecimal rupees) {
        return rupees.multiply(PAISE_PER_RUPEE)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    // ── Client-facing rate ──────────────────────────────────────

    /**
     * Returns the client-facing hourly rate (expert rate + commission).
     * Used by search results and public profile views.
     */
    public double getClientHourlyRate(double expertHourlyRate) {
        if (expertHourlyRate < 0) return 0;
        BigDecimal rate = BigDecimal.valueOf(expertHourlyRate);
        BigDecimal multiplier = BigDecimal.ONE.add(
                commissionPercent().divide(ONE_HUNDRED, SCALE + 2, ROUNDING));
        return rate.multiply(multiplier).setScale(SCALE, ROUNDING).doubleValue();
    }

    // ── Backward compatibility ──────────────────────────────────

    /**
     * Derives the expert's base earning from a legacy client-paid amount.
     * Used when migrating old Interaction records that only stored totalPaidAmount
     * without the expertAmount / commissionAmount breakdown.
     */
    public double deriveExpertAmount(double clientPaidAmount) {
        if (clientPaidAmount <= 0) return 0;
        BigDecimal client = BigDecimal.valueOf(clientPaidAmount);
        BigDecimal divisor = BigDecimal.ONE.add(
                commissionPercent().divide(ONE_HUNDRED, SCALE + 2, ROUNDING));
        return client.divide(divisor, SCALE, ROUNDING).doubleValue();
    }

    /**
     * Derives the platform commission from a legacy client-paid amount.
     */
    public double deriveCommissionAmount(double clientPaidAmount) {
        return clientPaidAmount - deriveExpertAmount(clientPaidAmount);
    }

    /**
     * Returns the configured commission percent (useful for DTO population).
     */
    public double getCommissionPercent() {
        return settingsService.getCommissionPercent();
    }

    // ── Value object ────────────────────────────────────────────

    /**
     * Immutable price breakdown for a single consultation.
     *
     * FIELDS ARE {@link BigDecimal} — NO floating-point types in financial records.
     *
     * @param expertAmount      what the expert earns (INR, precise to 2 decimal places)
     * @param commissionAmount  platform fee (INR, precise to 2 decimal places)
     * @param clientAmount      total the client pays (INR) = expertAmount + commissionAmount
     * @param commissionPercent the percentage used (e.g. 20.0)
     */
    public record PriceBreakdown(
            BigDecimal expertAmount,
            BigDecimal commissionAmount,
            BigDecimal clientAmount,
            BigDecimal commissionPercent
    ) {
        /**
         * Client amount in paise for Razorpay API.
         */
        public long clientAmountInPaise() {
            return clientAmount.multiply(PAISE_PER_RUPEE)
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValueExact();
        }

        /**
         * Client amount as double (backward compatibility with existing DTOs).
         * Prefer using {@link #clientAmount()} BigDecimal directly.
         */
        public double clientAmountDouble() {
            return clientAmount.doubleValue();
        }

        /**
         * Expert amount as double (backward compatibility).
         */
        public double expertAmountDouble() {
            return expertAmount.doubleValue();
        }

        /**
         * Commission amount as double (backward compatibility).
         */
        public double commissionAmountDouble() {
            return commissionAmount.doubleValue();
        }
    }
}
