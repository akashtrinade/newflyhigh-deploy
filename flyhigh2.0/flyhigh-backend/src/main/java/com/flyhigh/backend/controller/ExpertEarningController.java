package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.EarningsPage;
import com.flyhigh.backend.dto.EarningsSummaryResponse;
import com.flyhigh.backend.dto.ExpertEarningResponse;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.ExpertEarningService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Expert earnings dashboard API.
 * All endpoints require an authenticated EXPERT role.
 * Experts can only access their own earnings.
 */
@RestController
@RequestMapping("/api/expert/earnings")
public class ExpertEarningController {

    private static final Logger log = LoggerFactory.getLogger(ExpertEarningController.class);

    private final ExpertEarningService expertEarningService;
    private final AuthService authService;

    public ExpertEarningController(ExpertEarningService expertEarningService,
                                   AuthService authService) {
        this.expertEarningService = expertEarningService;
        this.authService = authService;
    }

    /**
     * Returns the aggregated earnings summary for the authenticated expert.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(Authentication authentication) {
        try {
            User user = authService.getUserByEmail(authentication.getName());
            validateExpert(user);

            EarningsSummaryResponse summary = expertEarningService.getEarningsSummary(user.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", summary
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error fetching earnings summary: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to fetch earnings summary"
            ));
        }
    }

    /**
     * Returns paginated earnings history with optional filters.
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String search) {
        try {
            User user = authService.getUserByEmail(authentication.getName());
            validateExpert(user);

            EarningsPage earningsPage = expertEarningService.getEarningsHistory(
                    user.getId(), page, size, status, fromDate, toDate, search
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", earningsPage
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error fetching earnings history: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to fetch earnings history"
            ));
        }
    }

    /**
     * Returns a single earning by ID. Validates that it belongs to the authenticated expert.
     */
    @GetMapping("/{earningId}")
    public ResponseEntity<Map<String, Object>> getEarning(
            Authentication authentication,
            @PathVariable String earningId) {
        try {
            User user = authService.getUserByEmail(authentication.getName());
            validateExpert(user);

            ExpertEarningResponse earning =
                    expertEarningService.getEarningByIdForExpert(earningId, user.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", earning
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error fetching earning {}: {}", earningId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to fetch earning"
            ));
        }
    }

    /**
     * Ensures the authenticated user has the EXPERT role.
     */
    private void validateExpert(User user) {
        if (user.getRole() == null || !user.getRole().equalsIgnoreCase("EXPERT")) {
            throw new SecurityException("Only experts can access earnings");
        }
    }

    /**
     * Manually triggers retroactive earnings processing for all completed paid sessions.
     * Admin-only (runs on startup automatically; exposed for operational use).
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/migrate")
    public ResponseEntity<Map<String, Object>> runMigration() {
        try {
            expertEarningService.processPastEarnings();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Migration triggered — check logs for details"
            ));
        } catch (Exception e) {
            log.error("Migration failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Migration failed"
            ));
        }
    }
}
