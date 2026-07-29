package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.AdminConsultationDto;
import com.flyhigh.backend.dto.AdminDashboardStats;
import com.flyhigh.backend.dto.AdminPaymentDto;
import com.flyhigh.backend.dto.AdminUserDto;
import com.flyhigh.backend.service.AdminService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ═══════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardStats> getDashboard() {
        log.info("AUDIT: Admin dashboard accessed");
        AdminDashboardStats stats = adminService.getDashboardStats();

        // Populate summary counts for latest entries
        stats.setLatestUsersCount(adminService.getLatestUsers(5).size());
        stats.setLatestExpertsCount(adminService.getExperts(0).size());
        stats.setLatestConsultationsCount(adminService.getConsultations(0).size());
        stats.setLatestPaymentsCount(adminService.getPayments(0).size());

        return ResponseEntity.ok(stats);
    }

    // ═══════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserDto>> getUsers(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed users (page={})", page);
        return ResponseEntity.ok(adminService.getUsers(page));
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
    public ResponseEntity<List<AdminUserDto>> getClients(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed clients (page={})", page);
        return ResponseEntity.ok(adminService.getClients(page));
    }

    // ═══════════════════════════════════════════
    // EXPERTS
    // ═══════════════════════════════════════════

    @GetMapping("/experts")
    public ResponseEntity<List<AdminUserDto>> getExperts(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed experts (page={})", page);
        return ResponseEntity.ok(adminService.getExperts(page));
    }

    // ═══════════════════════════════════════════
    // CONSULTATIONS
    // ═══════════════════════════════════════════

    @GetMapping("/consultations")
    public ResponseEntity<List<AdminConsultationDto>> getConsultations(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed consultations (page={})", page);
        return ResponseEntity.ok(adminService.getConsultations(page));
    }

    // ═══════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════

    @GetMapping("/payments")
    public ResponseEntity<List<AdminPaymentDto>> getPayments(
            @RequestParam(defaultValue = "0") int page) {
        log.info("AUDIT: Admin viewed payments (page={})", page);
        return ResponseEntity.ok(adminService.getPayments(page));
    }
}
