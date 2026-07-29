package com.flyhigh.backend.service;

import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.repository.InteractionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class SessionCleanupService {

    private static final Logger log = LoggerFactory.getLogger(SessionCleanupService.class);
    private static final long STALE_HOURS = 24;
    private static final List<SessionStatus> STALE_STATUSES = List.of(
            SessionStatus.FREE_SESSION,
            SessionStatus.PAYMENT_PENDING
    );

    private final InteractionRepository interactionRepository;

    public SessionCleanupService(InteractionRepository interactionRepository) {
        this.interactionRepository = interactionRepository;
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
}
