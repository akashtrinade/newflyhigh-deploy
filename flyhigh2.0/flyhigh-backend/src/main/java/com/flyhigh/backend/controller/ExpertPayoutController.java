package com.flyhigh.backend.controller;

import com.flyhigh.backend.exception.RazorpayXException;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.Payout;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.PayoutRepository;
import com.flyhigh.backend.repository.UserRepository;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.ExpertPayoutService;
import com.flyhigh.backend.service.RazorpayXPayoutGateway;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Expert payout API — withdrawal requests and bank/UPI details.
 * All endpoints require an authenticated EXPERT role.
 */
@RestController
@RequestMapping("/api/expert/payouts")
@PreAuthorize("hasRole('EXPERT')")
public class ExpertPayoutController {

    private static final Logger log = LoggerFactory.getLogger(ExpertPayoutController.class);

    private final ExpertPayoutService payoutService;
    private final AuthService authService;
    private final ExpertProfileRepository profileRepository;
    private final PayoutRepository payoutRepository;
    private final UserRepository userRepository;
    private final RazorpayXPayoutGateway razorpayXPayoutGateway;

    public ExpertPayoutController(ExpertPayoutService payoutService,
                                  AuthService authService,
                                  ExpertProfileRepository profileRepository,
                                  PayoutRepository payoutRepository,
                                  UserRepository userRepository,
                                  RazorpayXPayoutGateway razorpayXPayoutGateway) {
        this.payoutService = payoutService;
        this.authService = authService;
        this.profileRepository = profileRepository;
        this.payoutRepository = payoutRepository;
        this.userRepository = userRepository;
        this.razorpayXPayoutGateway = razorpayXPayoutGateway;
    }

    /**
     * POST /api/expert/payouts/withdraw
     * Expert requests a withdrawal of all eligible AVAILABLE earnings.
     */
    @PostMapping("/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(Authentication authentication) {
        try {
            User user = authService.getUserByEmail(authentication.getName());
            ExpertProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);

            ExpertPayoutService.WithdrawalResult result =
                    payoutService.requestWithdrawal(user.getId(), profile);

            if (!result.success()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", result.message()
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Withdrawal requested — the platform will process it shortly.",
                    "data", Map.of(
                            "payoutId", result.payout().getId(),
                            "amount", result.amount(),
                            "earningCount", result.earningCount()
                    )
            ));
        } catch (Exception e) {
            log.error("Error requesting withdrawal: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to request withdrawal"
            ));
        }
    }

    /**
     * GET /api/expert/payouts
     * Returns the expert's withdrawal history (newest first).
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getPayouts(Authentication authentication) {
        try {
            User user = authService.getUserByEmail(authentication.getName());

            List<Payout> payouts = payoutRepository.findByExpertIdOrderByCreatedAtDesc(user.getId());
            List<Map<String, Object>> content = new ArrayList<>();
            for (Payout p : payouts) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", p.getId());
                m.put("payoutAmount", p.getPayoutAmount() != null ? p.getPayoutAmount() : 0);
                m.put("status", p.getStatus() != null ? p.getStatus().name() : "PROCESSING");
                m.put("gatewayReferenceId", p.getGatewayReferenceId());
                m.put("errorMessage", p.getErrorMessage());
                m.put("earningCount", p.getEarningIds() != null ? p.getEarningIds().size() : 0);
                m.put("accountNumber", maskAccountNumber(p.getAccountNumber()));
                m.put("upiId", maskUpiId(p.getUpiId()));
                m.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
                m.put("processedAt", p.getProcessedAt() != null ? p.getProcessedAt().toString() : null);
                content.add(m);
            }

            return ResponseEntity.ok(Map.of("success", true, "data", content));
        } catch (Exception e) {
            log.error("Error fetching payouts: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to fetch payouts: " + e.getMessage()
            ));
        }
    }

    /**
     * GET /api/expert/payouts/details
     * Returns the expert's saved payout details (account number masked).
     */
    @GetMapping("/details")
    public ResponseEntity<Map<String, Object>> getDetails(Authentication authentication) {
        try {
            User user = authService.getUserByEmail(authentication.getName());
            ExpertProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);

            Map<String, Object> details = new LinkedHashMap<>();
            // Own payout details are shown in full to the owner (this endpoint is
            // expert-scoped) so the edit form can be pre-filled; last4 is for the
            // summary line. The transaction history (getPayouts) masks both fields.
            details.put("accountHolderName", profile != null ? profile.getPayoutAccountHolderName() : null);
            details.put("accountNumber", profile != null ? profile.getPayoutAccountNumber() : null);
            details.put("accountNumberLast4", last4(profile != null ? profile.getPayoutAccountNumber() : null));
            details.put("ifsc", profile != null ? profile.getPayoutIfsc() : null);
            details.put("upiId", profile != null ? profile.getPayoutUpiId() : null);
            details.put("verificationStatus", profile != null ? profile.getPayoutVerificationStatus() : null);
            details.put("verificationNote", profile != null ? profile.getPayoutVerificationNote() : null);

            return ResponseEntity.ok(Map.of("success", true, "data", details));
        } catch (Exception e) {
            log.error("Error fetching payout details: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to fetch payout details"
            ));
        }
    }

    /**
     * PUT /api/expert/payouts/details
     * Saves the expert's bank / UPI details used for withdrawals.
     * Either a full bank set (holder + account number + IFSC) or a UPI id is required.
     */
    @PutMapping("/details")
    public ResponseEntity<Map<String, Object>> saveDetails(
            Authentication authentication,
            @RequestBody Map<String, String> body) {
        try {
            User user = authService.getUserByEmail(authentication.getName());
            ExpertProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);
            if (profile == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Complete your expert profile first."
                ));
            }

            String holder = trimToNull(body.get("accountHolderName"));
            String accountNumber = trimToNull(body.get("accountNumber"));
            String ifsc = trimToNull(body.get("ifsc"));
            String upiId = trimToNull(body.get("upiId"));

            boolean hasBank = accountNumber != null && ifsc != null && holder != null;
            boolean hasUpi = upiId != null;
            boolean clearing = holder == null && accountNumber == null && ifsc == null && upiId == null;

            if (!hasBank && !hasUpi && !clearing) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Provide either full bank details (holder name, account number, IFSC) or a UPI id."
                ));
            }

            // Format validation before persisting
            String validationError = validatePayoutDetails(accountNumber, ifsc, upiId);
            if (validationError != null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", validationError
                ));
            }

            profile.setPayoutAccountHolderName(holder);
            profile.setPayoutAccountNumber(accountNumber);
            profile.setPayoutIfsc(ifsc);
            profile.setPayoutUpiId(upiId);

            // Reset verification whenever the destination changes; the async
            // RazorpayX check below re-arms it for full bank saves.
            profile.setPayoutVerificationStatus(null);
            profile.setPayoutVerificationNote(null);

            if (hasBank && razorpayXPayoutGateway != null && razorpayXPayoutGateway.isConfigured()) {
                try {
                    validateBankWithGateway(user, profile, holder, accountNumber, ifsc);
                } catch (RazorpayXException e) {
                    if (!e.isRetryable()) {
                        // Deterministic rejection from RazorpayX — don't store bad details.
                        return ResponseEntity.badRequest().body(Map.of(
                                "success", false,
                                "message", "Bank details could not be validated: " + e.getMessage()
                        ));
                    }
                    // Gateway outage — fail open (payout-time validation is the real guard).
                    log.warn("RazorpayX unavailable during save-details for expert {} — failing open: {}",
                            user.getId(), e.getMessage());
                }
            }

            profile.setUpdatedAt(Instant.now());
            profileRepository.save(profile);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Payout details saved."
            ));
        } catch (Exception e) {
            log.error("Error saving payout details: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to save payout details"
            ));
        }
    }

    // ── Helpers ──

    /**
     * Creates (or reuses) the expert's RazorpayX contact + bank fund account
     * and starts the ₹1 composite bank-account validation. The result arrives
     * asynchronously via the fund_account.validation webhook, which flips the
     * profile verification status to VERIFIED or FAILED.
     */
    private void validateBankWithGateway(User user, ExpertProfile profile,
                                         String holder, String accountNumber, String ifsc) {
        String referenceId = "expert_" + user.getId();

        String contactId = razorpayXPayoutGateway.fetchContactByReference(referenceId);
        if (contactId == null) {
            contactId = razorpayXPayoutGateway.createContact(holder, user.getEmail(), referenceId, user.getId());
        }
        profile.setPayoutContactId(contactId);

        String fundAccountId = razorpayXPayoutGateway.createFundAccount(contactId, false,
                new JSONObject()
                        .put("name", holder)
                        .put("ifsc", ifsc)
                        .put("account_number", accountNumber));
        profile.setPayoutFundAccountId(fundAccountId);

        String validationId = razorpayXPayoutGateway.startBankValidation(fundAccountId);
        if (validationId != null) {
            profile.setPayoutValidationId(validationId);
            profile.setPayoutVerificationStatus("PENDING");
            profile.setPayoutVerificationNote("Verification in progress");
        } else {
            // Validation unsupported (test mode / non-Lite account) — fail open.
            profile.setPayoutVerificationStatus(null);
            profile.setPayoutVerificationNote(null);
            log.info("Bank validation unsupported for expert {} — saving without gateway verification", user.getId());
        }
    }

    private String validatePayoutDetails(String accountNumber, String ifsc, String upiId) {
        if (accountNumber != null) {
            String digits = accountNumber.replaceAll("\\D", "");
            if (digits.length() < 9 || digits.length() > 18) {
                return "Account number must be 9–18 digits";
            }
        }
        if (ifsc != null && !ifsc.matches("^[A-Z]{4}0[A-Z0-9]{6}$")) {
            return "Invalid IFSC code (format: 4 letters, 0, 6 alphanumeric)";
        }
        if (upiId != null && !upiId.matches("^[\\w.\\-]{2,}@[a-zA-Z]{2,}$")) {
            return "Invalid UPI id (format: name@bankhandle)";
        }
        return null;
    }

    private String maskUpiId(String upiId) {
        if (upiId == null || upiId.isBlank()) return null;
        int at = upiId.indexOf('@');
        if (at <= 0) return upiId;
        String handle = upiId.substring(at);
        String name = upiId.substring(0, at);
        if (name.length() <= 2) return name.charAt(0) + "••" + handle;
        return name.charAt(0) + "••••" + name.charAt(name.length() - 1) + handle;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String last4(String accountNumber) {
        if (accountNumber == null) return null;
        String digits = accountNumber.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;
        return digits.substring(Math.max(0, digits.length() - 4));
    }

    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) return null;
        String last4 = last4(accountNumber);
        return last4 != null ? "•••• " + last4 : null;
    }
}
