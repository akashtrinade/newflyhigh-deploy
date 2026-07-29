package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.EarningsPage;
import com.flyhigh.backend.dto.EarningsSummaryResponse;
import com.flyhigh.backend.dto.ExpertEarningResponse;
import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Manages expert earnings: automatic creation when paid sessions complete,
 * aggregated dashboard summaries, and paginated earnings history.
 */
@Service
public class ExpertEarningService {

    private static final Logger log = LoggerFactory.getLogger(ExpertEarningService.class);

    private final ExpertEarningRepository expertEarningRepository;
    private final SessionPaymentRepository sessionPaymentRepository;
    private final InteractionRepository interactionRepository;
    private final UserRepository userRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final PricingService pricingService;

    public ExpertEarningService(ExpertEarningRepository expertEarningRepository,
                                SessionPaymentRepository sessionPaymentRepository,
                                InteractionRepository interactionRepository,
                                UserRepository userRepository,
                                ExpertProfileRepository expertProfileRepository,
                                PricingService pricingService) {
        this.expertEarningRepository = expertEarningRepository;
        this.sessionPaymentRepository = sessionPaymentRepository;
        this.interactionRepository = interactionRepository;
        this.userRepository = userRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.pricingService = pricingService;
    }

    // ── Earning Creation ──

    /**
     * On startup, retroactively create earnings for all past completed paid sessions
     * that don't have an ExpertEarning record yet.
     */
    @PostConstruct
    public void processPastEarnings() {
        log.info("Running retroactive earnings migration...");
        int count = 0;
        try {
            List<Interaction> completedInteractions = interactionRepository.findAll();
            for (Interaction interaction : completedInteractions) {
                if (interaction.getStatus() == SessionStatus.COMPLETED
                        && interaction.getPaymentStatus() == PaymentStatus.HELD
                        && interaction.getTotalPaidAmount() != null
                        && interaction.getTotalPaidAmount() > 0) {
                    if (expertEarningRepository.findByInteractionId(interaction.getId()).isEmpty()) {
                        processEarning(interaction);
                        count++;
                    }
                }
            }
            log.info("Retroactive earnings migration complete: {} earnings created", count);
        } catch (Exception e) {
            log.warn("Retroactive earnings migration skipped (DB may not be ready): {}", e.getMessage());
        }
    }

    /**
     * Creates an ExpertEarning record when a paid session completes.
     * Idempotent — safe to call multiple times for the same interaction.
     */
    public void processEarning(Interaction interaction) {
        // Idempotency: skip if already processed
        if (expertEarningRepository.findByInteractionId(interaction.getId()).isPresent()) {
            log.debug("Earning already exists for interaction {}, skipping", interaction.getId());
            return;
        }

        // Guard: only process paid sessions
        Double totalPaid = interaction.getTotalPaidAmount();
        if (totalPaid == null || totalPaid <= 0) {
            log.debug("No payment on interaction {}, skipping earning creation", interaction.getId());
            return;
        }

        // Guard: payment must be held (verified)
        if (interaction.getPaymentStatus() != PaymentStatus.HELD) {
            log.debug("Payment status is {} for interaction {}, skipping earning creation",
                    interaction.getPaymentStatus(), interaction.getId());
            return;
        }

        // Calculate earnings using stored breakdown or derive from totalPaidAmount
        double expertEarningAmount;
        double platformFee;
        double commissionPct;

        if (interaction.getExpertAmount() != null && interaction.getCommissionAmount() != null) {
            // New data: use stored breakdown
            expertEarningAmount = interaction.getExpertAmount();
            platformFee = interaction.getCommissionAmount();
            // commissionPercent from PricingService for accurate recording
            commissionPct = pricingService.getCommissionPercent();
        } else {
            // Legacy data: derive from totalPaidAmount using PricingService
            expertEarningAmount = pricingService.deriveExpertAmount(totalPaid);
            platformFee = pricingService.deriveCommissionAmount(totalPaid);
            commissionPct = pricingService.getCommissionPercent();
        }

        // Find the associated SessionPayment for linking
        List<SessionPayment> payments = sessionPaymentRepository.findByInteractionId(interaction.getId());
        String sessionPaymentId = payments.isEmpty() ? null : payments.get(0).getId();

        Instant now = Instant.now();

        ExpertEarning earning = ExpertEarning.builder()
                .expertId(interaction.getExpertId())
                .interactionId(interaction.getId())
                .sessionPaymentId(sessionPaymentId)
                .clientPaidAmount(totalPaid)
                .platformCommissionPercent(commissionPct)
                .platformFee(platformFee)
                .expertEarningAmount(expertEarningAmount)
                .status(EarningStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        expertEarningRepository.save(earning);

        log.info("Expert earning created: expertId={} interactionId={} clientPaid={} platformFee={} expertEarning={}",
                interaction.getExpertId(), interaction.getId(), totalPaid, platformFee, expertEarningAmount);
    }

    // ── Dashboard Summary ──

    /**
     * Returns aggregated earnings statistics for the expert's dashboard overview.
     */
    public EarningsSummaryResponse getEarningsSummary(String expertId) {
        List<ExpertEarning> allEarnings = expertEarningRepository.findByExpertId(expertId);

        double availableBalance = 0;
        double pendingBalance = 0;
        double lifetimeEarnings = 0;
        double platformCommission = 0;

        for (ExpertEarning e : allEarnings) {
            double earningAmount = e.getExpertEarningAmount() != null ? e.getExpertEarningAmount() : 0;
            double fee = e.getPlatformFee() != null ? e.getPlatformFee() : 0;

            lifetimeEarnings += earningAmount;
            platformCommission += fee;

            if (e.getStatus() == EarningStatus.AVAILABLE) {
                availableBalance += earningAmount;
            } else if (e.getStatus() == EarningStatus.PENDING) {
                pendingBalance += earningAmount;
            }
            // WITHDRAWN earnings are already included in lifetimeEarnings
        }

        long totalSessions = allEarnings.size();

        // Get average rating from expert profile
        double averageRating = 0.0;
        ExpertProfile profile = expertProfileRepository.findByUserId(expertId).orElse(null);
        if (profile != null && profile.getAverageRating() != null) {
            averageRating = profile.getAverageRating();
        }

        return new EarningsSummaryResponse(
                availableBalance, pendingBalance, lifetimeEarnings,
                platformCommission, totalSessions, averageRating);
    }

    // ── Earnings History ──

    /**
     * Returns a paginated, filtered list of earnings for the expert.
     * Uses DB-level pagination for status + date range. Client name search
     * is a post-filter applied only to the current page (not a full scan).
     */
    public EarningsPage getEarningsHistory(String expertId, int page, int size,
                                           String status, String fromDate, String toDate,
                                           String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        // Resolve date range
        Instant from = (fromDate != null && !fromDate.isEmpty()) ? Instant.parse(fromDate) : null;
        Instant to = (toDate != null && !toDate.isEmpty()) ? Instant.parse(toDate) : null;

        // Resolve status filter
        EarningStatus earningStatus = null;
        if (status != null && !status.isEmpty() && !status.equals("ALL")) {
            try {
                earningStatus = EarningStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid status → fall back to no status filter
            }
        }

        // DB-level paginated query (with date range if provided)
        Page<ExpertEarning> earningsPage;
        if (earningStatus != null && from != null && to != null) {
            earningsPage = expertEarningRepository
                    .findByExpertIdAndStatusAndCreatedAtBetweenOrderByCreatedAtDesc(
                            expertId, earningStatus, from, to, pageable);
        } else if (earningStatus != null) {
            earningsPage = expertEarningRepository
                    .findByExpertIdAndStatusOrderByCreatedAtDesc(expertId, earningStatus, pageable);
        } else if (from != null && to != null) {
            earningsPage = expertEarningRepository
                    .findByExpertIdAndCreatedAtBetweenOrderByCreatedAtDesc(expertId, from, to, pageable);
        } else {
            earningsPage = expertEarningRepository
                    .findByExpertIdOrderByCreatedAtDesc(expertId, pageable);
        }

        // Client name search: post-filter on current page only (not full scan)
        List<ExpertEarning> content = earningsPage.getContent();
        if (search != null && !search.isEmpty()) {
            content = filterByClientName(content, search.toLowerCase());
        }

        // Batch-load interactions + users (2 queries instead of 2N)
        List<ExpertEarningResponse> responses = batchToResponses(content);

        long total = search != null && !search.isEmpty()
                ? content.size()  // approximate when search-filtered
                : earningsPage.getTotalElements();

        return new EarningsPage(responses, total,
                earningsPage.getTotalPages(), earningsPage.getNumber(), earningsPage.getSize());
    }

    /**
     * Returns a single earning by ID, with security validated by the caller.
     */
    public ExpertEarningResponse getEarningById(String earningId) {
        ExpertEarning earning = expertEarningRepository.findById(earningId)
                .orElseThrow(() -> new IllegalArgumentException("Earning not found: " + earningId));
        return batchToResponses(List.of(earning)).get(0);
    }

    // ── Helpers ──

    /**
     * Batch-loads interactions and users, then maps earnings to response DTOs.
     * Collapses 2N queries into 2 queries regardless of list size.
     */
    private List<ExpertEarningResponse> batchToResponses(List<ExpertEarning> earnings) {
        if (earnings.isEmpty()) return List.of();

        // Batch-load all interactions in one query
        Set<String> interactionIds = earnings.stream()
                .map(ExpertEarning::getInteractionId)
                .collect(Collectors.toSet());
        Map<String, Interaction> interactionMap = interactionRepository.findAllById(interactionIds)
                .stream().collect(Collectors.toMap(Interaction::getId, Function.identity()));

        // Batch-load all client users in one query
        Set<String> clientIds = interactionMap.values().stream()
                .map(Interaction::getClientId)
                .collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(clientIds)
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return earnings.stream()
                .map(e -> toResponse(e, interactionMap, userMap))
                .collect(Collectors.toList());
    }

    /**
     * Maps a single earning to response DTO using pre-loaded maps (zero DB calls).
     */
    private ExpertEarningResponse toResponse(ExpertEarning earning,
                                              Map<String, Interaction> interactionMap,
                                              Map<String, User> userMap) {
        String clientName = "Unknown Client";
        int duration = 0;

        Interaction interaction = interactionMap.get(earning.getInteractionId());
        if (interaction != null) {
            User client = userMap.get(interaction.getClientId());
            if (client != null) {
                clientName = client.getFullName() != null ? client.getFullName() : client.getEmail();
            }
            duration = interaction.getActualDurationMinutes() != null
                    ? interaction.getActualDurationMinutes() : 0;
        }

        String sessionDate = "";
        if (earning.getCreatedAt() != null) {
            sessionDate = DateTimeFormatter.ISO_INSTANT.format(earning.getCreatedAt());
        }

        return new ExpertEarningResponse(
                earning.getId(),
                sessionDate,
                clientName,
                duration,
                earning.getClientPaidAmount() != null ? earning.getClientPaidAmount() : 0,
                earning.getPlatformFee() != null ? earning.getPlatformFee() : 0,
                earning.getExpertEarningAmount() != null ? earning.getExpertEarningAmount() : 0,
                earning.getStatus() != null ? earning.getStatus().name() : "PENDING"
        );
    }

    /**
     * Post-filters a page of earnings by client name (search).
     * Only runs on the current page, not the full collection.
     */
    private List<ExpertEarning> filterByClientName(List<ExpertEarning> earnings, String searchLower) {
        // Batch-load needed data for name matching (only for current page)
        Set<String> interactionIds = earnings.stream()
                .map(ExpertEarning::getInteractionId).collect(Collectors.toSet());
        Map<String, Interaction> interactionMap = interactionRepository.findAllById(interactionIds)
                .stream().collect(Collectors.toMap(Interaction::getId, Function.identity()));
        Set<String> clientIds = interactionMap.values().stream()
                .map(Interaction::getClientId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(clientIds)
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return earnings.stream().filter(e -> {
            Interaction interaction = interactionMap.get(e.getInteractionId());
            if (interaction == null) return false;
            User client = userMap.get(interaction.getClientId());
            if (client == null) return false;
            String name = client.getFullName() != null ? client.getFullName().toLowerCase() : "";
            String email = client.getEmail() != null ? client.getEmail().toLowerCase() : "";
            return name.contains(searchLower) || email.contains(searchLower);
        }).collect(Collectors.toList());
    }
}
