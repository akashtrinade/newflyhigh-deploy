package com.flyhigh.backend.controller;

import com.flyhigh.backend.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Map;

/**
 * Razorpay Webhook Controller.
 * Receives server-to-server payment confirmations from Razorpay.
 * This is a DEFENSE-IN-DEPTH layer — the primary verification path is
 * client-side signature verification. The webhook catches edge cases
 * where the client disconnects before verification completes.
 *
 * SECURITY: Validates Razorpay webhook signature using the webhook secret
 * (NOT the API key secret — Razorpay uses a separate secret for webhooks).
 */
@RestController
@RequestMapping("/api/webhooks")
public class RazorpayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayWebhookController.class);

    private final PaymentService paymentService;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    public RazorpayWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Receives payment captured events from Razorpay.
     * Validates webhook signature, then idempotently processes the payment.
     */
    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("X-Razorpay-Signature") String receivedSignature,
            @RequestBody String rawBody) {

        // ── Validate webhook signature ──
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Razorpay webhook secret not configured — ignoring webhook");
            return ResponseEntity.ok("Webhook secret not configured");
        }

        if (!verifyWebhookSignature(rawBody, receivedSignature)) {
            log.error("Razorpay webhook signature validation FAILED");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        // ── Parse and process event ──
        try {
            // Simple JSON parsing without a full library dependency
            String event = extractJsonString(rawBody, "event");
            String paymentId = extractJsonString(rawBody, "payment_id");
            String orderId = extractJsonString(rawBody, "order_id");

            if (!"payment.captured".equals(event)) {
                log.debug("Ignoring non-capture webhook event: {}", event);
                return ResponseEntity.ok("Ignored");
            }

            log.info("Webhook received: payment.captured paymentId={} orderId={}",
                    truncateForLog(paymentId), truncateForLog(orderId));

            // Try to verify the payment (idempotent — safe to call multiple times)
            // The service layer handles duplicate detection
            try {
                paymentService.processWebhookPayment(orderId, paymentId);
            } catch (Exception e) {
                log.error("Webhook payment processing failed (may be duplicate): {}", e.getMessage());
                // Return 200 to prevent Razorpay retry storms for duplicates
            }

            return ResponseEntity.ok("Processed");
        } catch (Exception e) {
            log.error("Webhook body parsing error: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid body");
        }
    }

    /**
     * Verifies Razorpay webhook signature: HMAC-SHA256(webhookSecret, rawBody)
     */
    private boolean verifyWebhookSignature(String rawBody, String receivedSignature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(), "HmacSHA256"));
            byte[] hash = mac.doFinal(rawBody.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));

            // Constant-time comparison
            String generated = hex.toString();
            if (generated.length() != receivedSignature.length()) return false;
            int result = 0;
            for (int i = 0; i < generated.length(); i++) {
                result |= generated.charAt(i) ^ receivedSignature.charAt(i);
            }
            return result == 0;
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /** Minimal JSON string field extraction — avoids adding a full JSON parser dependency. */
    private String extractJsonString(String json, String key) {
        String search = "\"" + key + "\"";
        int keyIdx = json.indexOf(search);
        if (keyIdx < 0) return null;
        int colonIdx = json.indexOf(":", keyIdx);
        if (colonIdx < 0) return null;
        int startQuote = json.indexOf("\"", colonIdx);
        if (startQuote < 0) return null;
        int endQuote = json.indexOf("\"", startQuote + 1);
        if (endQuote < 0) return null;
        return json.substring(startQuote + 1, endQuote);
    }

    private String truncateForLog(String s) {
        if (s == null) return "null";
        return s.length() <= 12 ? s.substring(0, 4) + "****" : s.substring(0, 8) + "****" + s.substring(s.length() - 4);
    }
}
