package com.flyhigh.backend.service;

import com.flyhigh.backend.model.PlatformSettings;
import com.flyhigh.backend.repository.PlatformSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Single source of truth for runtime-tunable platform settings.
 *
 * Persisted overrides (the "global" document in platform_settings) take
 * precedence over the property-file defaults. All consumers (pricing,
 * settlement, payout) read through this service so admin changes take
 * effect immediately without a redeploy.
 */
@Service
public class PlatformSettingsService {

    private static final Logger log = LoggerFactory.getLogger(PlatformSettingsService.class);

    private final PlatformSettingsRepository settingsRepository;

    @Value("${platform.commission.percent:20}")
    private double defaultCommissionPercent;

    @Value("${settlement.period-minutes:10}")
    private int defaultSettlementPeriodMinutes;

    @Value("${payout.minimum-amount:1000}")
    private double defaultPayoutMinAmount;

    @Value("${payout.provider:manual}")
    private String defaultPayoutProvider;

    @Value("${payout.auto-create:false}")
    private boolean defaultAutoCreate;

    public PlatformSettingsService(PlatformSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    /**
     * Returns the current effective settings (persisted overrides merged
     * over property defaults). Never returns null.
     */
    public PlatformSettings getEffectiveSettings() {
        PlatformSettings persisted = settingsRepository.findById(PlatformSettings.GLOBAL_ID).orElse(null);
        PlatformSettings merged = PlatformSettings.builder()
                .id(PlatformSettings.GLOBAL_ID)
                .commissionPercent(persisted != null && persisted.getCommissionPercent() != null
                        ? persisted.getCommissionPercent() : defaultCommissionPercent)
                .settlementPeriodMinutes(persisted != null && persisted.getSettlementPeriodMinutes() != null
                        ? persisted.getSettlementPeriodMinutes() : defaultSettlementPeriodMinutes)
                .payoutMinAmount(persisted != null && persisted.getPayoutMinAmount() != null
                        ? persisted.getPayoutMinAmount() : defaultPayoutMinAmount)
                .payoutProvider(persisted != null && persisted.getPayoutProvider() != null
                        ? persisted.getPayoutProvider() : defaultPayoutProvider)
                .settlementEnabled(persisted != null && persisted.getSettlementEnabled() != null
                        ? persisted.getSettlementEnabled() : true)
                .payoutEnabled(persisted != null && persisted.getPayoutEnabled() != null
                        ? persisted.getPayoutEnabled() : true)
                .updatedAt(persisted != null && persisted.getUpdatedAt() != null
                        ? persisted.getUpdatedAt() : Instant.now())
                .build();
        return merged;
    }

    /**
     * Validates and persists new settings. Returns the effective settings after save.
     *
     * @throws IllegalArgumentException if any value is out of range
     */
    public PlatformSettings updateSettings(Map<String, Object> body) {
        PlatformSettings current = getEffectiveSettings();

        double commission = body.containsKey("commissionPercent")
                ? ((Number) body.get("commissionPercent")).doubleValue() : current.getCommissionPercent();
        int settlementMinutes = body.containsKey("settlementPeriodMinutes")
                ? ((Number) body.get("settlementPeriodMinutes")).intValue() : current.getSettlementPeriodMinutes();
        double minAmount = body.containsKey("payoutMinAmount")
                ? ((Number) body.get("payoutMinAmount")).doubleValue() : current.getPayoutMinAmount();
        String provider = body.containsKey("payoutProvider")
                ? String.valueOf(body.get("payoutProvider")) : current.getPayoutProvider();
        boolean settlementEnabled = body.containsKey("settlementEnabled")
                ? Boolean.TRUE.equals(body.get("settlementEnabled")) : current.getSettlementEnabled();
        boolean payoutEnabled = body.containsKey("payoutEnabled")
                ? Boolean.TRUE.equals(body.get("payoutEnabled")) : current.getPayoutEnabled();

        if (commission < 0 || commission > 100) {
            throw new IllegalArgumentException("commissionPercent must be between 0 and 100");
        }
        if (settlementMinutes < 1 || settlementMinutes > 1440) {
            throw new IllegalArgumentException("settlementPeriodMinutes must be between 1 and 1440");
        }
        if (minAmount < 0) {
            throw new IllegalArgumentException("payoutMinAmount cannot be negative");
        }
        if (provider == null || provider.isBlank()) {
            provider = defaultPayoutProvider;
        }

        PlatformSettings updated = PlatformSettings.builder()
                .id(PlatformSettings.GLOBAL_ID)
                .commissionPercent(commission)
                .settlementPeriodMinutes(settlementMinutes)
                .payoutMinAmount(minAmount)
                .payoutProvider(provider)
                .settlementEnabled(settlementEnabled)
                .payoutEnabled(payoutEnabled)
                .updatedAt(Instant.now())
                .build();

        settingsRepository.save(updated);
        log.info("Platform settings updated: commission={} settlement={}min minPayout={} provider={} settlementOn={} payoutOn={}",
                commission, settlementMinutes, minAmount, provider, settlementEnabled, payoutEnabled);
        return updated;
    }

    // ── Convenience getters for runtime consumers ──

    public double getCommissionPercent() {
        return getEffectiveSettings().getCommissionPercent();
    }

    public int getSettlementPeriodMinutes() {
        return getEffectiveSettings().getSettlementPeriodMinutes();
    }

    public double getPayoutMinAmount() {
        return getEffectiveSettings().getPayoutMinAmount();
    }

    public String getPayoutProvider() {
        return getEffectiveSettings().getPayoutProvider();
    }

    public boolean isSettlementEnabled() {
        return getEffectiveSettings().getSettlementEnabled();
    }

    public boolean isPayoutEnabled() {
        return getEffectiveSettings().getPayoutEnabled();
    }

    /**
     * Whether the scheduled worker auto-bundles AVAILABLE earnings into payouts
     * at the minimum threshold (independent of the payout worker master toggle,
     * which gates the whole cycle). Defaults off — withdrawals are expert-initiated.
     */
    public boolean isAutoCreateEnabled() {
        return defaultAutoCreate;
    }
}
