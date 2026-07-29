package com.flyhigh.backend.service;

import com.flyhigh.backend.model.CallRequest;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.repository.CallRequestRepository;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Handles the session lifecycle: starting free trials, transitioning to paid,
 * ending sessions, and calculating durations.
 */
@Service
public class SessionStateService {

    private static final Logger log = LoggerFactory.getLogger(SessionStateService.class);

    private final InteractionRepository interactionRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final CallRequestRepository callRequestRepository;
    private final ExpertEarningService expertEarningService;

    @Value("${session.free-trial-seconds:300}")
    private int freeTrialSeconds;

    public SessionStateService(InteractionRepository interactionRepository,
                               ExpertProfileRepository expertProfileRepository,
                               CallRequestRepository callRequestRepository,
                               ExpertEarningService expertEarningService) {
        this.interactionRepository = interactionRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.callRequestRepository = callRequestRepository;
        this.expertEarningService = expertEarningService;
    }

    /**
     * Starts the free trial for an interaction. Called when expert accepts the call.
     */
    public void startFreeTrial(Interaction interaction) {
        ExpertProfile expertProfile = expertProfileRepository.findByUserId(interaction.getExpertId())
                .orElse(null);

        double rate = expertProfile != null && expertProfile.getHourlyRate() != null
                ? expertProfile.getHourlyRate() : 0.0;

        interaction.setRateSnapshot(rate);
        interaction.setFreeTrialEndsAt(Instant.now().plusSeconds(freeTrialSeconds));
        interaction.setStatus(SessionStatus.FREE_SESSION);
        interactionRepository.save(interaction);

        log.info("Free trial started: interactionId={} freeTrialEndsAt={} rateSnapshot={}",
                interaction.getId(), interaction.getFreeTrialEndsAt(), rate);
    }

    /**
     * Ends the session and calculates actual duration.
     */
    public void endSession(Interaction interaction) {
        interaction.setEndedAt(Instant.now());

        // Calculate actual duration
        int totalSeconds = 0;
        if (interaction.getStartedAt() != null && interaction.getEndedAt() != null) {
            totalSeconds = (int) (interaction.getEndedAt().getEpochSecond()
                    - interaction.getStartedAt().getEpochSecond());
        }
        interaction.setActualDurationMinutes(totalSeconds / 60);

        if (interaction.getStatus() != SessionStatus.COMPLETED
                && interaction.getStatus() != SessionStatus.FREE_SESSION_EXPIRED) {
            interaction.setStatus(SessionStatus.COMPLETED);
        }

        interactionRepository.save(interaction);

        // Also update the linked CallRequest status to COMPLETED
        CallRequest callRequest = callRequestRepository.findByInteractionId(interaction.getId()).orElse(null);
        if (callRequest != null) {
            callRequest.setStatus("COMPLETED");
            callRequest.setRespondedAt(Instant.now());
            callRequestRepository.save(callRequest);
        }

        expertEarningService.processEarning(interaction);
        log.info("Session ended: interactionId={} actualDurationMin={} status={}",
                interaction.getId(), interaction.getActualDurationMinutes(), interaction.getStatus());
    }
}
