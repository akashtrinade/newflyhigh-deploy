package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.AdminConsultationDto;
import com.flyhigh.backend.dto.AdminDashboardStats;
import com.flyhigh.backend.dto.AdminPaymentDto;
import com.flyhigh.backend.dto.AdminUserDto;
import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.*;
import com.flyhigh.backend.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin Controller — endpoints for the Admin Portal.
 *
 * SECURITY: All endpoints require the ADMIN role.
 * Access is enforced via @PreAuthorize("hasRole('ADMIN')") — only JWT tokens
 * carrying ROLE_ADMIN authority can access these endpoints.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
    private static final int REPORT_DAYS = 30;

    private final AdminService adminService;
    private final DisputeService disputeService;
    private final RefundService refundService;
    private final ExpertEarningRepository expertEarningRepository;
    private final PayoutRepository payoutRepository;
    private final DisputeRepository disputeRepository;
    private final RefundRepository refundRepository;
    private final SessionPaymentRepository sessionPaymentRepository;
    private final ExpertPayoutService expertPayoutService;
    private final UserRepository userRepository;
    private final PlatformSettingsService settingsService;

    public AdminController(AdminService adminService,
                           DisputeService disputeService,
                           RefundService refundService,
                           ExpertEarningRepository expertEarningRepository,
                           PayoutRepository payoutRepository,
                           DisputeRepository disputeRepository,
                           RefundRepository refundRepository,
                           SessionPaymentRepository sessionPaymentRepository,
                           ExpertPayoutService expertPayoutService,
                           UserRepository userRepository,
                           PlatformSettingsService settingsService) {
        this.adminService = adminService;
        this.disputeService = disputeService;
        this.refundService = refundService;
        this.expertEarningRepository = expertEarningRepository;
        this.payoutRepository = payoutRepository;
        this.disputeRepository = disputeRepository;
        this.refundRepository = refundRepository;
        this.sessionPaymentRepository = sessionPaymentRepository;
        this.expertPayoutService = expertPayoutService;
        this.userRepository = userRepository;
        this.settingsService = settingsService;
    }

    // ═══════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════

    /**
     * Builds the page-shaped response the admin UI expects:
     * { content, totalPages, totalElements, page }
     */
    private Map<String, Object> pageResponse(Page<?> page) {
        return Map.of("content", page.getContent(), "totalPages", page.getTotalPages(),
                "totalElements", page.getTotalElements(), "page", page.getNumber());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardStats> getDashboard() {
        log.info("AUDIT: Admin dashboard accessed");
        AdminDashboardStats stats = adminService.getDashboardStats();

        // Populate summary counts for latest entries
        stats.setLatestUsersCount(adminService.getLatestUsers(5).size());
        stats.setLatestExpertsCount(adminService.getExperts(0).getTotalElements());
        stats.setLatestConsultationsCount(adminService.getConsultations(0).getTotalElements());
        stats.setLatestPaymentsCount(adminService.getPayments(0).getTotalElements());

        return ResponseEntity.ok(stats);
    }

    // ═══════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed users (page={})", page);
        return ResponseEntity.ok(pageResponse(adminService.getUsers(page)));
    }

    @GetMapping("/users/recent")
    public ResponseEntity<List<AdminUserDto>> getRecentUsers(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(adminService.getLatestUsers(limit));
    }

    // ═══════════════════════════════════════════
    // CLIENTS
    // ═══════════════════════════════════════════

    @GetMapping("/clients")
    public ResponseEntity<Map<String, Object>> getClients(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed clients (page={})", page);
        return ResponseEntity.ok(pageResponse(adminService.getClients(page)));
    }

    // ═══════════════════════════════════════════
    // EXPERTS
    // ═══════════════════════════════════════════

    @GetMapping("/experts")
    public ResponseEntity<Map<String, Object>> getExperts(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed experts (page={})", page);
        return ResponseEntity.ok(pageResponse(adminService.getExperts(page)));
    }

    // ═══════════════════════════════════════════
    // CONSULTATIONS
    // ═══════════════════════════════════════════

    @GetMapping("/consultations")
    public ResponseEntity<Map<String, Object>> getConsultations(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed consultations (page={})", page);
        return ResponseEntity.ok(pageResponse(adminService.getConsultations(page)));
    }

    // ═══════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════

    @GetMapping("/payments")
    public ResponseEntity<Map<String, Object>> getPayments(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed payments (page={})", page);
        return ResponseEntity.ok(pageResponse(adminService.getPayments(page)));
    }

    // ═══════════════════════════════════════════
    // EXPERT EARNINGS
    // ═══════════════════════════════════════════

    @GetMapping("/earnings")
    public ResponseEntity<Map<String, Object>> getEarnings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String status) {
        log.info("AUDIT: Admin viewed earnings (page={})", page);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        PageRequest pr = PageRequest.of(page, 20, sort);
        Page<ExpertEarning> earnings;
        if (status != null && !status.isEmpty()) {
            try {
                EarningStatus earningStatus = EarningStatus.valueOf(status);
                earnings = expertEarningRepository.findByStatus(earningStatus, pr);
            } catch (IllegalArgumentException e) {
                earnings = expertEarningRepository.findAll(pr);
            }
        } else {
            earnings = expertEarningRepository.findAll(pr);
        }
        List<Map<String, Object>> content = earnings.getContent().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("expertId", e.getExpertId());
            m.put("expertEarningAmount", e.getExpertEarningAmount());
            m.put("platformFee", e.getPlatformFee());
            m.put("clientPaidAmount", e.getClientPaidAmount());
            m.put("status", e.getStatus() != null ? e.getStatus().name() : "PENDING");
            m.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(Map.of("content", content, "totalPages", earnings.getTotalPages(),
                "totalElements", earnings.getTotalElements(), "page", earnings.getNumber()));
    }

    // ═══════════════════════════════════════════
    // PAYOUTS
    // ═══════════════════════════════════════════

    @GetMapping("/payouts")
    public ResponseEntity<Map<String, Object>> getPayouts(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed payouts (page={})", page);
        Page<Payout> payouts = payoutRepository.findAll(PageRequest.of(page, 20, Sort.by(Sort.Direction.DESC, "createdAt")));

        // Batch-load expert names
        Map<String, User> userMap = new HashMap<>();
        List<String> expertIds = payouts.getContent().stream().map(Payout::getExpertId).distinct().toList();
        if (!expertIds.isEmpty()) {
            userRepository.findAllById(expertIds).forEach(u -> userMap.put(u.getId(), u));
        }

        Map<String, User> finalUserMap = userMap;
        List<Map<String, Object>> content = payouts.getContent().stream().map(p -> {
            User expert = finalUserMap.get(p.getExpertId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("expertId", p.getExpertId());
            m.put("expertName", expert != null
                    ? (expert.getFullName() != null ? expert.getFullName() : expert.getEmail())
                    : p.getExpertId());
            m.put("expertEmail", expert != null ? expert.getEmail() : null);
            m.put("earningIds", p.getEarningIds());
            m.put("earningCount", p.getEarningIds() != null ? p.getEarningIds().size() : 0);
            m.put("payoutAmount", p.getPayoutAmount());
            m.put("status", p.getStatus() != null ? p.getStatus().name() : "PENDING");
            m.put("gatewayPayoutId", p.getGatewayPayoutId());
            m.put("mode", p.getMode());
            m.put("gatewayReferenceId", p.getGatewayReferenceId());
            m.put("errorMessage", p.getErrorMessage());
            m.put("retryCount", p.getRetryCount());
            m.put("accountHolderName", p.getAccountHolderName());
            m.put("accountNumber", p.getAccountNumber());
            m.put("ifsc", p.getIfsc());
            m.put("upiId", p.getUpiId());
            m.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
            m.put("processedAt", p.getProcessedAt() != null ? p.getProcessedAt().toString() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(Map.of("content", content, "totalPages", payouts.getTotalPages(),
                "totalElements", payouts.getTotalElements(), "page", payouts.getNumber()));
    }

    /**
     * POST /api/admin/payouts/{id}/complete
     * Marks a PROCESSING payout as SUCCESS after the manual bank/UPI transfer,
     * storing the transaction reference provided by the admin.
     */
    @PostMapping("/payouts/{id}/complete")
    public ResponseEntity<Map<String, Object>> completePayout(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        Payout payout = payoutRepository.findById(id).orElse(null);
        if (payout == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Payout not found"));
        }
        if (payout.getStatus() != PayoutStatus.PROCESSING) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Only PROCESSING payouts can be completed (current: " + payout.getStatus() + ")"
            ));
        }
        String reference = body.get("gatewayReferenceId");
        if (reference == null || reference.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "gatewayReferenceId (transaction/UTR reference) is required"
            ));
        }

        log.info("AUDIT: Admin completing payout {} with reference {}", id, reference.trim());
        expertPayoutService.completePayout(payout, reference.trim());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payout marked as paid — earnings updated to PAID."
        ));
    }

    /**
     * POST /api/admin/payouts/{id}/fail
     * Marks a PROCESSING payout as FAILED and releases its earnings so the
     * expert can request a new withdrawal.
     */
    @PostMapping("/payouts/{id}/fail")
    public ResponseEntity<Map<String, Object>> failPayout(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        Payout payout = payoutRepository.findById(id).orElse(null);
        if (payout == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Payout not found"));
        }
        if (payout.getStatus() != PayoutStatus.PROCESSING) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Only PROCESSING payouts can be failed (current: " + payout.getStatus() + ")"
            ));
        }
        if (payout.getGatewayPayoutId() != null && !payout.getGatewayPayoutId().isBlank()) {
            // The transfer is managed by RazorpayX — failing it here doesn't stop
            // the money, and late webhooks would conflict with the released earnings.
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "This payout is managed by RazorpayX. Wait for the gateway result; if the transfer actually succeeded, complete it manually with the UTR."
            ));
        }
        String reason = body.getOrDefault("reason", "Marked failed by admin");
        if (reason == null || reason.isBlank()) {
            reason = "Marked failed by admin";
        }

        log.info("AUDIT: Admin failing payout {} — {}", id, reason);
        expertPayoutService.failPayout(payout, reason.trim());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payout failed — earnings released back to the expert."
        ));
    }

    // ═══════════════════════════════════════════
    // DISPUTES
    // ═══════════════════════════════════════════

    @GetMapping("/disputes")
    public ResponseEntity<Map<String, Object>> getDisputes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String status) {
        log.info("AUDIT: Admin viewed disputes (page={}, status={})", page, status);
        DisputeStatus filter = null;
        if (status != null && !status.isEmpty()) {
            try { filter = DisputeStatus.valueOf(status); } catch (IllegalArgumentException ignored) {}
        }
        Page<Dispute> disputes;
        if (filter != null) {
            disputes = disputeRepository.findByStatusOrderByCreatedAtAsc(filter, PageRequest.of(page, 20));
        } else {
            disputes = disputeRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, 20));
        }
        List<Map<String, Object>> content = disputes.getContent().stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId());
            m.put("interactionId", d.getInteractionId());
            m.put("clientId", d.getClientId());
            m.put("expertId", d.getExpertId());
            m.put("reason", d.getReason());
            m.put("clientStatement", d.getClientStatement());
            m.put("expertResponse", d.getExpertResponse());
            m.put("status", d.getStatus() != null ? d.getStatus().name() : "OPEN");
            m.put("decision", d.getDecision());
            m.put("decisionReason", d.getDecisionReason());
            m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
            m.put("resolvedAt", d.getResolvedAt() != null ? d.getResolvedAt().toString() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(Map.of("content", content, "totalPages", disputes.getTotalPages(),
                "totalElements", disputes.getTotalElements(), "page", disputes.getNumber()));
    }

    @GetMapping("/disputes/{id}")
    public ResponseEntity<?> getDispute(@PathVariable String id) {
        return ResponseEntity.ok(disputeService.getDispute(id));
    }

    @PostMapping("/disputes/{id}/decision")
    public ResponseEntity<?> decideDispute(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            String decision = body.get("decision");
            String note = body.getOrDefault("note", "");
            Dispute dispute = disputeService.adminDecide(id, decision, "ADMIN", note);

            if ("ACCEPT".equalsIgnoreCase(decision)) {
                Refund refund = refundService.createRefundFromDisputeIfAbsent(dispute, "ADMIN");
                log.info("AUDIT: Dispute {} accepted — refund {} queued for interaction {}",
                        id, refund.getId(), dispute.getInteractionId());
            }
            return ResponseEntity.ok(Map.of("success", true, "dispute", dispute));
        } catch (IllegalArgumentException e) {
            log.warn("Dispute decision rejected: {} — {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Dispute decision conflict: {} — {}", id, e.getMessage());
            return ResponseEntity.status(409).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════
    // REFUNDS
    // ═══════════════════════════════════════════

    @GetMapping("/refunds")
    public ResponseEntity<Map<String, Object>> getRefunds(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed refunds (page={})", page);
        Page<Refund> refunds = refundRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, 20));
        List<Map<String, Object>> content = refunds.getContent().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("interactionId", r.getInteractionId());
            m.put("paymentId", r.getPaymentId());
            m.put("refundAmount", r.getRefundAmount());
            m.put("status", r.getStatus() != null ? r.getStatus().name() : "PENDING_APPROVAL");
            m.put("reason", r.getReason());
            m.put("approvedBy", r.getApprovedBy());
            m.put("razorpayRefundId", r.getRazorpayRefundId());
            m.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
            m.put("processedAt", r.getProcessedAt() != null ? r.getProcessedAt().toString() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(Map.of("content", content, "totalPages", refunds.getTotalPages(),
                "totalElements", refunds.getTotalElements(), "page", refunds.getNumber()));
    }

    /**
     * POST /api/admin/refunds/{id}/approve
     * Approves a PENDING_APPROVAL refund and processes it (marks COMPLETED in
     * manual/mock mode; earning adjusted to REFUND_ADJUSTED).
     */
    @PostMapping("/refunds/{id}/approve")
    public ResponseEntity<?> approveRefund(@PathVariable String id) {
        try {
            Refund refund = refundService.approveAndProcess(id, "ADMIN");
            log.info("AUDIT: Admin approved+processed refund {}", id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Refund approved and processed.",
                    "refund", toRefundView(refund)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * POST /api/admin/refunds/{id}/reject
     * Rejects a PENDING_APPROVAL refund with an optional note.
     */
    @PostMapping("/refunds/{id}/reject")
    public ResponseEntity<?> rejectRefund(@PathVariable String id,
                                          @RequestBody(required = false) Map<String, String> body) {
        try {
            String note = body != null ? body.getOrDefault("note", "Rejected by admin") : "Rejected by admin";
            Refund refund = refundService.rejectRefund(id, "ADMIN", note);
            log.info("AUDIT: Admin rejected refund {} — {}", id, note);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Refund rejected.",
                    "refund", toRefundView(refund)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private Map<String, Object> toRefundView(Refund r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("interactionId", r.getInteractionId());
        m.put("paymentId", r.getPaymentId());
        m.put("refundAmount", r.getRefundAmount());
        m.put("status", r.getStatus() != null ? r.getStatus().name() : "PENDING_APPROVAL");
        m.put("reason", r.getReason());
        m.put("approvedBy", r.getApprovedBy());
        m.put("razorpayRefundId", r.getRazorpayRefundId());
        m.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        m.put("processedAt", r.getProcessedAt() != null ? r.getProcessedAt().toString() : null);
        return m;
    }

    // ═══════════════════════════════════════════
    // REPORTS
    // ═══════════════════════════════════════════

    @GetMapping("/reports/summary")
    public ResponseEntity<Map<String, Object>> getReportSummary() {
        AdminDashboardStats stats = adminService.getDashboardStats();
        long openDisputes = disputeRepository.countByStatusNot(DisputeStatus.RESOLVED);

        double totalPayouts = payoutRepository.findAll().stream()
                .filter(p -> p.getStatus() == PayoutStatus.SUCCESS)
                .mapToDouble(p -> p.getPayoutAmount() != null ? p.getPayoutAmount() : 0.0)
                .sum();
        double totalRefunds = refundRepository.findAll().stream()
                .filter(r -> r.getStatus() == RefundStatus.COMPLETED)
                .mapToDouble(r -> r.getRefundAmount() != null ? r.getRefundAmount() : 0.0)
                .sum();

        double commission = settingsService.getCommissionPercent();
        double platformRevenue = stats.getPlatformRevenue(); // all-time, already includes today
        double platformCommission = platformRevenue * commission / 100.0;

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("totalRevenue", platformRevenue);
        report.put("platformCommission", platformCommission);
        report.put("commissionPercent", commission);
        report.put("totalPayouts", totalPayouts);
        report.put("totalRefunds", totalRefunds);
        report.put("openDisputes", openDisputes);
        report.put("completedSessions", stats.getCompletedConsultations());
        return ResponseEntity.ok(report);
    }

    @GetMapping("/reports/daily")
    public ResponseEntity<List<Map<String, Object>>> getDailyReport() {
        LocalDate today = LocalDate.now(REPORT_ZONE);
        LocalDate cutoff = today.minusDays(REPORT_DAYS);

        Map<LocalDate, Double> revenueByDay = sessionPaymentRepository.findAll().stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()))
                .filter(p -> p.getChargedAt() != null)
                .filter(p -> p.getChargedAt().isAfter(cutoff.atStartOfDay(REPORT_ZONE).toInstant()))
                .collect(Collectors.groupingBy(
                        p -> p.getChargedAt().atZone(REPORT_ZONE).toLocalDate(),
                        Collectors.summingDouble(p -> p.getAmount() != null ? p.getAmount() : 0.0)));

        Map<LocalDate, Double> payoutsByDay = payoutRepository.findAll().stream()
                .filter(p -> p.getStatus() == PayoutStatus.SUCCESS)
                .filter(p -> p.getProcessedAt() != null)
                .filter(p -> p.getProcessedAt().isAfter(cutoff.atStartOfDay(REPORT_ZONE).toInstant()))
                .collect(Collectors.groupingBy(
                        p -> p.getProcessedAt().atZone(REPORT_ZONE).toLocalDate(),
                        Collectors.summingDouble(p -> p.getPayoutAmount() != null ? p.getPayoutAmount() : 0.0)));

        Map<LocalDate, Double> refundsByDay = refundRepository.findAll().stream()
                .filter(r -> r.getStatus() == RefundStatus.COMPLETED)
                .filter(r -> r.getProcessedAt() != null)
                .filter(r -> r.getProcessedAt().isAfter(cutoff.atStartOfDay(REPORT_ZONE).toInstant()))
                .collect(Collectors.groupingBy(
                        r -> r.getProcessedAt().atZone(REPORT_ZONE).toLocalDate(),
                        Collectors.summingDouble(r -> r.getRefundAmount() != null ? r.getRefundAmount() : 0.0)));

        List<Map<String, Object>> daily = new ArrayList<>();
        for (int i = REPORT_DAYS - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", day.toString());
            point.put("revenue", revenueByDay.getOrDefault(day, 0.0));
            point.put("payouts", payoutsByDay.getOrDefault(day, 0.0));
            point.put("refunds", refundsByDay.getOrDefault(day, 0.0));
            daily.add(point);
        }
        return ResponseEntity.ok(daily);
    }

    // ═══════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════

    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        PlatformSettings s = settingsService.getEffectiveSettings();
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("commissionPercent", s.getCommissionPercent());
        settings.put("settlementPeriodMinutes", s.getSettlementPeriodMinutes());
        settings.put("payoutMinAmount", s.getPayoutMinAmount());
        settings.put("payoutProvider", s.getPayoutProvider());
        settings.put("settlementEnabled", s.getSettlementEnabled());
        settings.put("payoutEnabled", s.getPayoutEnabled());
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, Object> body) {
        try {
            PlatformSettings updated = settingsService.updateSettings(body);
            log.info("AUDIT: Admin updated settings: {}", body);
            Map<String, Object> settings = new LinkedHashMap<>();
            settings.put("commissionPercent", updated.getCommissionPercent());
            settings.put("settlementPeriodMinutes", updated.getSettlementPeriodMinutes());
            settings.put("payoutMinAmount", updated.getPayoutMinAmount());
            settings.put("payoutProvider", updated.getPayoutProvider());
            settings.put("settlementEnabled", updated.getSettlementEnabled());
            settings.put("payoutEnabled", updated.getPayoutEnabled());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Settings updated",
                    "settings", settings
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (ClassCastException | NullPointerException e) {
            log.warn("Invalid settings payload: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid settings payload"
            ));
        }
    }
}
