package com.flyhigh.backend.service;

import com.flyhigh.backend.model.CallRequest;
import com.mongodb.client.result.UpdateResult;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.CallRequestRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Periodic cleanup for call/session lifecycle state:
 * 1. Auto-completes sessions stuck in FREE_SESSION/PAYMENT_PENDING for > 24h.
 * 2. Expires PENDING call requests no expert responded to within the TTL,
 *    so they don't linger forever (closes the loop when a client abandons the
 *    waiting screen — the UI's own 60s timeout shows "No Response" locally,
 *    but the DB row previously stayed PENDING indefinitely).
 */
@Service
public class SessionCleanupService {

    private static final Logger log = LoggerFactory.getLogger(SessionCleanupService.class);
    private static final long STALE_HOURS = 24;
    private static final List<SessionStatus> STALE_STATUSES = List.of(
            SessionStatus.FREE_SESSION,
            SessionStatus.PAYMENT_PENDING
    );

    private final InteractionRepository interactionRepository;
    private final CallRequestRepository callRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MongoTemplate mongoTemplate;

    @Value("${call-request.pending-ttl-minutes:2}")
    private long pendingTtlMinutes;

    public SessionCleanupService(InteractionRepository interactionRepository,
                                 CallRequestRepository callRequestRepository,
                                 UserRepository userRepository,
                                 NotificationService notificationService,
                                 MongoTemplate mongoTemplate) {
        this.interactionRepository = interactionRepository;
        this.callRequestRepository = callRequestRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.mongoTemplate = mongoTemplate;
    }

    @Scheduled(cron = "0 */30 * * * *")
    public void cleanupStaleSessions() {
        Instant cutoff = Instant.now().minus(STALE_HOURS, ChronoUnit.HOURS);
        List<Interaction> stale = interactionRepository.findByStatusInAndStartedAtBefore(
                STALE_STATUSES, cutoff);

        if (stale.isEmpty()) {
            log.debug("Session cleanup: no stale sessions found");
            return;
        }

        int completed = 0;
        for (Interaction interaction : stale) {
            try {
                interaction.setStatus(SessionStatus.COMPLETED);
                interaction.setEndedAt(Instant.now());
                interactionRepository.save(interaction);
                completed++;
            } catch (Exception e) {
                log.warn("Failed to auto-complete stale session {}: {}", interaction.getId(), e.getMessage());
            }
        }

        log.info("Session cleanup: auto-completed {} stale sessions (cutoff: {}h, checked: {})",
                completed, STALE_HOURS, stale.size());
    }

    @Scheduled(cron = "${call-request.cleanup.cron:0 * * * * *}")
    public void expireStalePendingCallRequests() {
        Instant cutoff = Instant.now().minus(pendingTtlMinutes, ChronoUnit.MINUTES);
        List<CallRequest> stale = callRequestRepository.findByStatusAndCreatedAtBefore("PENDING", cutoff);

        if (stale.isEmpty()) {
            log.debug("Call request cleanup: no stale PENDING requests");
            return;
        }

        int expired = 0;
        for (CallRequest request : stale) {
            try {
                // Conditional atomic update: only flips requests still PENDING,
                // so a concurrent expert accept/reject can never be overwritten.
                Query query = new Query(Criteria.where("_id").is(request.getId())
                        .and("status").is("PENDING"));
                Update update = new Update()
                        .set("status", "CANCELLED")
                        .set("rejectReason", "No response from expert. Request expired.")
                        .set("respondedAt", Instant.now());
                UpdateResult result = mongoTemplate.updateFirst(query, update, CallRequest.class);

                if (result.getModifiedCount() > 0) {
                    expired++;
                    notifyClientOfExpiry(request);
                }
            } catch (Exception e) {
                log.warn("Failed to expire stale call request {}: {}", request.getId(), e.getMessage());
            }
        }

        log.info("Call request cleanup: expired {} stale PENDING requests (ttl: {}m, checked: {})",
                expired, pendingTtlMinutes, stale.size());
    }

    /**
     * In-app notification to the client that their request expired.
     * Non-fatal — notification failures never break the cleanup sweep.
     */
    private void notifyClientOfExpiry(CallRequest request) {
        User expert = userRepository.findById(request.getExpertId()).orElse(null);
        if (expert == null) {
            return;
        }
        String expertName = expert.getFullName() != null ? expert.getFullName() : expert.getFirstName();
        notificationService.createForUser(
                request.getClientId(),
                "video-call",
                "Your consultation request to " + expertName + " expired (no response).",
                null,
                expert.getEmail());
    }
}
