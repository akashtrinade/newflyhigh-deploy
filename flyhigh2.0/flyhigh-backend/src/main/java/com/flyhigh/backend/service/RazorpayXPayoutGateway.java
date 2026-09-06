package com.flyhigh.backend.service;

import com.flyhigh.backend.exception.RazorpayXException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

/**
 * RazorpayX Payouts API client — automatic bank/UPI transfers to experts.
 *
 * Uses the JDK's built-in HttpClient (no new dependencies; the razorpay-java
 * SDK does not ship payout/contact clients). Mirrors the null-safe patterns of
 * {@code RazorpayConfig}/{@code PaymentService}: when keys are missing the bean
 * exists but {@link #isConfigured()} is false and callers fall back to the
 * manual admin flow.
 *
 * Endpoints (base https://api.razorpay.com/v1):
 *   GET  /contacts/{referenceId}        — fetch contact by reference id (404 → null)
 *   POST /contacts                      — create contact
 *   POST /fund_accounts                 — create bank_account / vpa fund account
 *   POST /payouts                       — create immediate payout (X-Payout-Idempotency header)
 *   GET  /payouts/{id}                  — fetch payout status
 *   POST /fund_accounts/validations     — ₹1 composite bank-account validation (async result)
 */
@Service
public class RazorpayXPayoutGateway {

    private static final Logger log = LoggerFactory.getLogger(RazorpayXPayoutGateway.class);

    private static final String BASE_URL = "https://api.razorpay.com/v1";
    private static final long IMPS_MAX_PAISE = 50_000_000L; // ₹5,00,000 — RBI IMPS per-txn cap

    private final String keyId;
    private final String keySecret;
    private final String accountNumber;
    private final boolean configured;
    private final HttpClient client;
    private final String basicAuth;

    public RazorpayXPayoutGateway(
            @Value("${razorpay.x.key.id:}") String keyId,
            @Value("${razorpay.x.key.secret:}") String keySecret,
            @Value("${razorpay.x.account.number:}") String accountNumber) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.accountNumber = accountNumber;
        this.configured = isNotBlank(keyId) && isNotBlank(keySecret) && isNotBlank(accountNumber);

        this.client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.basicAuth = configured
                ? "Basic " + Base64.getEncoder().encodeToString((keyId + ":" + keySecret).getBytes())
                : null;

        if (!configured) {
            log.warn("RazorpayX keys/account number not configured — automatic payouts disabled (manual fallback active)");
        } else {
            String maskedKey = keyId.length() > 8 ? keyId.substring(0, 8) + "..." : "***";
            log.info("RazorpayX payout gateway initialized with key id: {}", maskedKey);
        }
    }

    public boolean isConfigured() {
        return configured;
    }

    // ── Public API ────────────────────────────────────────────────

    /** GET /contacts/{referenceId} → contact id, or null when the contact does not exist. */
    public String fetchContactByReference(String referenceId) {
        ensureConfigured();
        try {
            return request("GET", "/contacts/" + referenceId, null, null).getString("id");
        } catch (RazorpayXException e) {
            if (e.isNotFound()) return null;
            throw e;
        }
    }

    /** POST /contacts → contact id. */
    public String createContact(String name, String email, String referenceId, String expertId) {
        ensureConfigured();
        JSONObject body = new JSONObject()
                .put("name", name)
                .put("type", "vendor")
                .put("contact", email)
                .put("reference_id", referenceId)
                .put("notes", new JSONObject().put("expertId", expertId));
        return request("POST", "/contacts", body, null).getString("id");
    }

    /** POST /fund_accounts (bank_account | vpa) → fund account id. X dedupes identical tuples. */
    public String createFundAccount(String contactId, boolean vpa, JSONObject details) {
        ensureConfigured();
        JSONObject body = new JSONObject()
                .put("contact_id", contactId)
                .put("account_type", vpa ? "vpa" : "bank_account");
        if (vpa) {
            body.put("vpa", details);
        } else {
            body.put("bank_account", details);
        }
        return request("POST", "/fund_accounts", body, null).getString("id");
    }

    /**
     * POST /payouts → the RazorpayX payout entity (id, status).
     * Idempotent via the X-Payout-Idempotency header — retries with the same
     * key return the same payout instead of creating a duplicate transfer.
     */
    @CircuitBreaker(name = "razorpayxCircuitBreaker", fallbackMethod = "gatewayUnavailable")
    @Retry(name = "razorpayxRetry")
    public JSONObject createPayout(String fundAccountId, long amountPaise, String mode,
                                   String referenceId, String narration, String payoutId) {
        ensureConfigured();
        JSONObject body = new JSONObject()
                .put("account_number", accountNumber)
                .put("fund_account_id", fundAccountId)
                .put("amount", amountPaise)
                .put("currency", "INR")
                .put("mode", mode)
                .put("purpose", "payout")
                .put("queue_if_low_balance", true)
                .put("reference_id", referenceId)
                .put("narration", narration)
                .put("notes", new JSONObject().put("payoutId", payoutId));
        return request("POST", "/payouts", body, payoutId);
    }

    /** GET /payouts/{id} → payout entity (status, utr, status_details). */
    @CircuitBreaker(name = "razorpayxCircuitBreaker", fallbackMethod = "gatewayUnavailable")
    @Retry(name = "razorpayxRetry")
    public JSONObject fetchPayout(String gatewayPayoutId) {
        ensureConfigured();
        return request("GET", "/payouts/" + gatewayPayoutId, null, null);
    }

    /**
     * POST /fund_accounts/validations — starts a ₹1 composite bank-account
     * validation. The result arrives asynchronously via the
     * {@code fund_account.validation.completed|failed} webhooks.
     * Returns the validation transaction id, or null when the gateway is
     * unavailable (callers fail open).
     */
    @CircuitBreaker(name = "razorpayxCircuitBreaker", fallbackMethod = "validationUnavailable")
    @Retry(name = "razorpayxRetry")
    public String startBankValidation(String fundAccountId) {
        ensureConfigured();
        JSONObject body = new JSONObject()
                .put("account_number", accountNumber)
                .put("fund_account", new JSONObject().put("id", fundAccountId))
                .put("amount", 100)
                .put("currency", "INR")
                .put("notes", new JSONObject().put("purpose", "save-details-check"));
        return request("POST", "/fund_accounts/validations", body, null).getString("id");
    }

    /**
     * Picks the RazorpayX payout mode: UPI for VPA fund accounts, IMPS for
     * bank accounts up to ₹5L, NEFT above (IMPS per-transaction cap).
     */
    public static String selectMode(boolean hasUpi, long amountPaise) {
        if (hasUpi) return "UPI";
        return amountPaise > IMPS_MAX_PAISE ? "NEFT" : "IMPS";
    }

    // ── Resilience fallbacks ──────────────────────────────────────

    /** Circuit-breaker/retry fallback for gateway calls — fail fast with a clear error. */
    public JSONObject gatewayUnavailable(String fundAccountId, long amountPaise, String mode,
                                         String referenceId, String narration, String payoutId,
                                         Throwable t) {
        throw toException(t);
    }

    public JSONObject gatewayUnavailable(String gatewayPayoutId, Throwable t) {
        throw toException(t);
    }

    /**
     * Validation fallback — fail open so experts are never blocked by a gateway
     * outage, but surface deterministic 4xx rejections from RazorpayX (bad
     * account/IFSC data must reach the caller as a validation error).
     */
    public String validationUnavailable(String fundAccountId, Throwable t) {
        if (t instanceof RazorpayXException rxe && !rxe.isRetryable()) {
            throw rxe;
        }
        log.warn("RazorpayX bank validation unavailable (falling back to format checks): {}", t.getMessage());
        return null;
    }

    private RazorpayXException toException(Throwable t) {
        if (t instanceof RazorpayXException rxe) return rxe;
        return RazorpayXException.network("RazorpayX payout gateway unavailable");
    }

    // ── HTTP plumbing ─────────────────────────────────────────────

    private JSONObject request(String method, String path, JSONObject body, String idempotencyKey) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + path))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", basicAuth)
                    .header("Accept", "application/json");
            if (idempotencyKey != null) {
                builder.header("X-Payout-Idempotency", idempotencyKey);
            }
            if (body != null) {
                builder.header("Content-Type", "application/json")
                        .method(method, HttpRequest.BodyPublishers.ofString(body.toString()));
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }

            HttpResponse<String> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            String payload = response.body();

            if (status >= 200 && status < 300) {
                if (payload == null || payload.isBlank()) return new JSONObject();
                return new JSONObject(payload);
            }

            String errorCode = null;
            String description = null;
            try {
                JSONObject err = new JSONObject(payload).optJSONObject("error");
                if (err != null) {
                    errorCode = err.optString("code", null);
                    description = err.optString("description", null);
                }
            } catch (Exception ignored) {
                // non-JSON error body — use status-based message
            }
            if (description == null || description.isBlank()) {
                description = "RazorpayX request failed with HTTP " + status;
            }
            throw RazorpayXException.http(status, errorCode, description);
        } catch (RazorpayXException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw RazorpayXException.network("RazorpayX request interrupted");
        } catch (IOException e) {
            throw RazorpayXException.network("RazorpayX network error: " + e.getMessage());
        }
    }

    private void ensureConfigured() {
        if (!configured) {
            throw new IllegalStateException("RazorpayX not configured");
        }
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}
