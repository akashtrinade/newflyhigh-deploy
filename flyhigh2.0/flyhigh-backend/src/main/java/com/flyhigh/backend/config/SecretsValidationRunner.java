package com.flyhigh.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates critical secrets on application startup.
 *
 * In production, this fails fast if any critical secret is missing or
 * using a placeholder/default value. This prevents deploying with
 * insecure defaults that would expose the application.
 *
 * In dev, only logs warnings for missing secrets (doesn't fail).
 */
@Component
public class SecretsValidationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SecretsValidationRunner.class);

    @Value("${SPRING_PROFILES_ACTIVE:dev}")
    private String activeProfile;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${MONGODB_URI:}")
    private String mongoUri;

    @Value("${MAIL_USERNAME:}")
    private String mailUsername;

    @Value("${MAIL_PASSWORD:}")
    private String mailPassword;

    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;

    @Value("${GOOGLE_CLIENT_SECRET:}")
    private String googleClientSecret;

    @Value("${RAZORPAY_KEY_ID:}")
    private String razorpayKeyId;

    @Value("${RAZORPAY_KEY_SECRET:}")
    private String razorpayKeySecret;

    @Value("${RAZORPAYX_KEY_ID:}")
    private String razorpayxKeyId;

    @Value("${RAZORPAYX_KEY_SECRET:}")
    private String razorpayxKeySecret;

    @Value("${RAZORPAYX_ACCOUNT_NUMBER:}")
    private String razorpayxAccountNumber;

    @Value("${RAZORPAYX_WEBHOOK_SECRET:}")
    private String razorpayxWebhookSecret;

    private static final String PLACEHOLDER_PREFIX = "your-";
    private static final String TEST_KEY_PREFIX = "rzp_test_";

    @Override
    public void run(String... args) {
        List<String> missing = new ArrayList<>();
        List<String> insecure = new ArrayList<>();

        // Critical secrets that MUST be set in all profiles
        checkRequired("JWT_SECRET", jwtSecret, missing, insecure);
        checkRequired("MONGODB_URI", mongoUri, missing, insecure);

        // Conditional secrets (required in prod when features are enabled)
        boolean isProd = "prod".equalsIgnoreCase(activeProfile);

        if (isProd || !isBlank(mailUsername) || !isBlank(mailPassword)) {
            checkRequired("MAIL_USERNAME", mailUsername, missing, insecure);
            checkRequired("MAIL_PASSWORD", mailPassword, missing, insecure);
        }

        if (isProd || !isBlank(googleClientId) || !isBlank(googleClientSecret)) {
            checkRequired("GOOGLE_CLIENT_ID", googleClientId, missing, insecure);
            checkRequired("GOOGLE_CLIENT_SECRET", googleClientSecret, missing, insecure);
        }

        if (isProd || !isBlank(razorpayKeyId) || !isBlank(razorpayKeySecret)) {
            checkRequired("RAZORPAY_KEY_ID", razorpayKeyId, missing, insecure);
            checkRequired("RAZORPAY_KEY_SECRET", razorpayKeySecret, missing, insecure);
        }

        // Log results
        if (!insecure.isEmpty()) {
            log.warn("INSECURE SECRETS DETECTED — using placeholder or default values: {}", insecure);
        }

        if (!missing.isEmpty()) {
            String msg = "CRITICAL SECRETS MISSING: " + String.join(", ", missing)
                    + ". Set these environment variables before running in production.";
            if (isProd) {
                log.error(msg);
                throw new IllegalStateException(msg);
            } else {
                log.warn(msg);
                log.warn("Continuing in dev mode — but these must be set for production!");
            }
        }

        if (missing.isEmpty() && insecure.isEmpty()) {
            log.info("Secrets validation passed — all critical secrets are configured.");
        }

        // Extra: warn about test keys in production
        if (isProd && razorpayKeyId != null && razorpayKeyId.startsWith(TEST_KEY_PREFIX)) {
            log.error("RAZORPAY_KEY_ID starts with 'rzp_test_' — TEST keys detected in PRODUCTION!");
            throw new IllegalStateException(
                    "Razorpay TEST key detected in production. Set RAZORPAY_KEY_ID to a live key.");
        }

        // RazorpayX (payouts) — warn only. Missing keys fall back to the manual
        // admin payout flow, so startup must never fail here.
        if (isProd && razorpayxKeyId != null && razorpayxKeyId.startsWith(TEST_KEY_PREFIX)) {
            log.warn("RAZORPAYX_KEY_ID starts with 'rzp_test_' — TEST payout keys detected in production!");
        }
        boolean razorpayxConfigured = !isBlank(razorpayxKeyId)
                && !isBlank(razorpayxKeySecret)
                && !isBlank(razorpayxAccountNumber);
        if (isProd && !razorpayxConfigured) {
            log.warn("RazorpayX payout keys not fully configured — automatic payouts disabled, manual admin flow active.");
        }
        if (razorpayxConfigured && isBlank(razorpayxWebhookSecret)) {
            log.warn("RAZORPAYX_WEBHOOK_SECRET missing — payout status webhooks will be ignored (reconcile worker still covers misses).");
        }
    }

    private void checkRequired(String name, String value, List<String> missing, List<String> insecure) {
        if (isBlank(value)) {
            missing.add(name);
        } else if (isPlaceholder(value)) {
            insecure.add(name + " (placeholder value: '" + truncate(value, 20) + "')");
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private boolean isPlaceholder(String value) {
        if (value == null) return false;
        String lower = value.toLowerCase();
        return lower.startsWith(PLACEHOLDER_PREFIX)
                || lower.contains("change-me")
                || lower.contains("change_me")
                || lower.equals("secret")
                || lower.equals("password")
                || lower.equals("test");
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "...";
    }
}
