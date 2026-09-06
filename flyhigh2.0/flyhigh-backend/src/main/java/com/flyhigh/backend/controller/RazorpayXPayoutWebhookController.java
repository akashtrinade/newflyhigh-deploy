package com.flyhigh.backend.controller;

import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.Payout;
import com.flyhigh.backend.model.PayoutStatus;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.PayoutRepository;
import com.flyhigh.backend.service.ExpertPayoutService;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;

/**
 * RazorpayX payout webhook — receives automatic payout status updates.
 *
 * SECURITY: validates the X-Razorpay-Signature header using the RazorpayX
 * webhook secret (separate from the API key secret), same constant-time
 * pattern as {@link RazorpayWebhookController}.
 *
 * Events handled:
 *   payout.processed               → complete the payout (earnings → PAID)
 *   payout.reversed/failed/...     → fail the payout (earnings released)
 *   payout.updated                 → attach the UTR
 *   fund_account.validation.*      → resolve the save-details bank verification
 */
@RestController
@RequestMapping("/api/webhooks")
public class RazorpayXPayoutWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayXPayoutWebhookController.class);

    private final ExpertPayoutService payoutService;
    private final PayoutRepository payoutRepository;
    private final ExpertProfileRepository profileRepository;

    @Value("${razorpay.x.webhook.secret:}")
    private String webhookSecret;

    public RazorpayXPayoutWebhookController(ExpertPayoutService payoutService,
                                            PayoutRepository payoutRepository,
                                            ExpertProfileRepository profileRepository) {
        this.payoutService = payoutService;
        this.payoutRepository = payoutRepository;
        this.profileRepository = profileRepository;
    }

    @PostMapping("/razorpayx")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("X-Razorpay-Signature") String receivedSignature,
            @RequestBody String rawBody) {

        // ── Validate webhook signature ──
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("RazorpayX webhook secret not configured — ignoring webhook");
            return ResponseEntity.ok("Webhook secret not configured");
        }

        if (!verifyWebhookSignature(rawBody, receivedSignature)) {
            log.error("RazorpayX webhook signature validation FAILED");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        // ── Dispatch — always 200 so a processing bug can't cause retry storms;
        //    the reconcile worker covers anything missed here. ──
        try {
            JSONObject json = new JSONObject(rawBody);
            String event = json.optString("event");

            if (event.startsWith("payout.")) {
                handlePayoutEvent(event, json);
            } else if (event.startsWith("fund_account.validation.")) {
                handleValidationEvent(event, json);
            } else {
                log.debug("Ignoring unknown RazorpayX webhook event: {}", event);
            }
            return ResponseEntity.ok("Processed");
        } catch (Exception e) {
            log.error("RazorpayX webhook processing error (ignored): {}", e.getMessage());
            return ResponseEntity.ok("Processed");
        }
    }

    // ── Payout events ─────────────────────────────────────────────

    private void handlePayoutEvent(String event, JSONObject json) {
        JSONObject payload = json.optJSONObject("payload");
        JSONObject entity = payload != null && payload.optJSONObject("payout") != null
                ? payload.optJSONObject("payout").optJSONObject("entity") : null;
        if (entity == null) {
            log.warn("RazorpayX payout webhook without entity — ignoring event {}", event);
            return;
        }

        String gatewayPayoutId = entity.optString("id");
        Payout payout = gatewayPayoutId.isEmpty() ? null
                : payoutRepository.findByGatewayPayoutId(gatewayPayoutId).orElse(null);

        switch (event) {
            case "payout.processed" -> {
                if (payout == null) {
                    log.warn("payout.processed for unknown gateway payout {} — reconcile will pick it up", gatewayPayoutId);
                    return;
                }
                if (payout.getStatus() == PayoutStatus.FAILED) {
                    // Earnings were released and may have been re-withdrawn — flipping
                    // to SUCCESS now could double-pay the expert. Manual admin review.
                    log.error("CRITICAL: payout.processed received for FAILED payout {} (gateway {}) — manual review required",
                            payout.getId(), gatewayPayoutId);
                    return;
                }
                payoutService.completePayout(payout, entity.optString("utr"));
            }
            case "payout.reversed", "payout.failed", "payout.rejected", "payout.cancelled" -> {
                if (payout == null) {
                    log.warn("{} for unknown gateway payout {} — reconcile will pick it up", event, gatewayPayoutId);
                    return;
                }
                JSONObject statusDetails = entity.optJSONObject("status_details");
                String reason = firstNonBlank(
                        entity.optString("failure_reason"),
                        statusDetails != null ? statusDetails.optString("reason") : null,
                        statusDetails != null ? statusDetails.optString("description") : null,
                        event);
                payoutService.failPayout(payout, "Gateway: " + reason);
            }
            case "payout.updated" -> {
                String utr = entity.optString("utr");
                if (payout != null && payout.getStatus() == PayoutStatus.PROCESSING && !utr.isEmpty()) {
                    payout.setGatewayReferenceId(utr);
                    payoutRepository.save(payout);
                }
            }
            default -> log.debug("Ignoring informational RazorpayX payout event: {}", event);
        }
    }

    // ── Bank validation events ────────────────────────────────────

    private void handleValidationEvent(String event, JSONObject json) {
        JSONObject payload = json.optJSONObject("payload");
        JSONObject entity = findValidationEntity(payload);
        if (entity == null) {
            log.warn("RazorpayX validation webhook without entity — ignoring event {}", event);
            return;
        }

        String validationId = entity.optString("id");
        ExpertProfile profile = validationId.isEmpty() ? null
                : profileRepository.findByPayoutValidationId(validationId).orElse(null);
        if (profile == null) {
            log.warn("{} for unknown validation {} — ignoring", event, validationId);
            return;
        }

        if ("fund_account.validation.completed".equals(event)) {
            JSONObject results = entity.optJSONObject("validation_results");
            String accountStatus = results != null ? results.optString("account_status") : null;
            int nameMatchScore = results != null ? results.optInt("name_match_score", -1) : -1;
            String registeredName = results != null ? results.optString("registered_name") : null;
            String details = results != null ? results.optString("details") : null;

            // Only an actually-inactive/bad account blocks withdrawals. Name-match
            // score is recorded as a note, not enforced — initials and short-name
            // variations cause false rejections.
            if ("active".equalsIgnoreCase(accountStatus)) {
                profile.setPayoutVerificationStatus("VERIFIED");
                profile.setPayoutVerificationNote(registeredName != null && !registeredName.isBlank()
                        ? "Registered name: " + registeredName
                        : "Name match score: " + nameMatchScore);
            } else {
                profile.setPayoutVerificationStatus("FAILED");
                profile.setPayoutVerificationNote(firstNonBlank(details,
                        "account_status=" + accountStatus + ", name_match_score=" + nameMatchScore));
            }
        } else { // fund_account.validation.failed
            profile.setPayoutVerificationStatus("FAILED");
            profile.setPayoutVerificationNote("RazorpayX could not validate the account");
        }

        profile.setUpdatedAt(Instant.now());
        profileRepository.save(profile);
        log.info("Bank verification {} for expert {} (validation {})",
                profile.getPayoutVerificationStatus(), profile.getUserId(), validationId);
    }

    /**
     * Validation webhook payload nesting varies by account type — try the
     * documented shapes in order.
     */
    private JSONObject findValidationEntity(JSONObject payload) {
        if (payload == null) return null;
        JSONObject fundAccount = payload.optJSONObject("fund_account");
        if (fundAccount != null) {
            if (fundAccount.optJSONObject("validation") != null) {
                return fundAccount.optJSONObject("validation").optJSONObject("entity");
            }
            if (fundAccount.optJSONObject("entity") != null) {
                return fundAccount.optJSONObject("entity");
            }
        }
        if (payload.optJSONObject("validation") != null) {
            return payload.optJSONObject("validation").optJSONObject("entity");
        }
        return null;
    }

    // ── Helpers ───────────────────────────────────────────────────

    /** HMAC-SHA256 of the raw body vs the X-Razorpay-Signature header, constant-time compare. */
    private boolean verifyWebhookSignature(String rawBody, String receivedSignature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(), "HmacSHA256"));
            byte[] hash = mac.doFinal(rawBody.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));

            String generated = hex.toString();
            if (generated.length() != receivedSignature.length()) return false;
            int result = 0;
            for (int i = 0; i < generated.length(); i++) {
                result |= generated.charAt(i) ^ receivedSignature.charAt(i);
            }
            return result == 0;
        } catch (Exception e) {
            log.error("RazorpayX webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
