package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.CallActionRequest;
import com.flyhigh.backend.dto.CallRequestDto;
import com.flyhigh.backend.dto.RatingRequest;
import com.flyhigh.backend.model.*;
import com.flyhigh.backend.model.NotificationPreferences;
import com.flyhigh.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service handling video call requests, accept/reject, status, and post-call rating.
 */
@Service
public class VideoCallService {

    private static final Logger log = LoggerFactory.getLogger(VideoCallService.class);

    private final CallRequestRepository callRequestRepository;
    private final UserRepository userRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final InteractionRepository interactionRepository;
    private final EmailService emailService;
    private final SessionStateService sessionStateService;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    public VideoCallService(CallRequestRepository callRequestRepository,
                            UserRepository userRepository,
                            ExpertProfileRepository expertProfileRepository,
                            InteractionRepository interactionRepository,
                            EmailService emailService,
                            SessionStateService sessionStateService,
                            org.springframework.data.mongodb.core.MongoTemplate mongoTemplate) {
        this.callRequestRepository = callRequestRepository;
        this.userRepository = userRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.interactionRepository = interactionRepository;
        this.emailService = emailService;
        this.sessionStateService = sessionStateService;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Client initiates a call request to an expert.
     */
    public CallRequestDto createCallRequest(String clientId, String expertId) {
        // Verify users exist
        User client = userRepository.findById(clientId).orElse(null);
        User expert = userRepository.findById(expertId).orElse(null);
        if (client == null || expert == null) {
            throw new IllegalArgumentException("Client or Expert not found");
        }

        // Check if expert is online
        ExpertProfile expertProfile = expertProfileRepository.findByUserId(expertId).orElse(null);
        if (expertProfile == null || !Boolean.TRUE.equals(expertProfile.getIsOnline())) {
            throw new IllegalStateException("Expert is not online");
        }

        // Auto-cancel old pending calls from this client to this expert
        List<CallRequest> existingPending = callRequestRepository.findByExpertIdAndStatus(expertId, "PENDING");
        for (CallRequest old : existingPending) {
            old.setStatus("CANCELLED");
            old.setRespondedAt(Instant.now());
            old.setRejectReason("New call request placed");
            callRequestRepository.save(old);
        }

        // Also cancel any pending calls from this client to any expert
        List<CallRequest> clientPending = callRequestRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        for (CallRequest old : clientPending) {
            if ("PENDING".equals(old.getStatus()) && !old.getExpertId().equals(expertId)) {
                old.setStatus("CANCELLED");
                old.setRespondedAt(Instant.now());
                old.setRejectReason("New call request placed");
                callRequestRepository.save(old);
            }
        }

        // Create call request
        CallRequest callRequest = new CallRequest();
        callRequest.setClientId(clientId);
        callRequest.setExpertId(expertId);
        callRequest.setClientName(client.getFullName() != null ? client.getFullName() : client.getFirstName());
        callRequest.setClientEmail(client.getEmail());
        callRequest.setStatus("PENDING");
        callRequest.setCreatedAt(Instant.now());
        callRequestRepository.save(callRequest);

        log.info("Call request created: client={} expert={} callId={}", clientId, expertId, callRequest.getId());

        // ── Send email notification to expert (respects notification preferences) ──
        sendCallRequestNotification(expert, client);

        return toDto(callRequest);
    }

    /**
     * Expert accepts or rejects a call request.
     */
    public CallRequestDto respondToCall(CallActionRequest request) {
        CallRequest callRequest = callRequestRepository.findById(request.getCallRequestId()).orElse(null);
        if (callRequest == null) {
            throw new IllegalArgumentException("Call request not found");
        }

        if (!"PENDING".equals(callRequest.getStatus())) {
            throw new IllegalStateException("Call request is no longer pending");
        }

        if ("ACCEPT".equalsIgnoreCase(request.getAction())) {
            String roomId = UUID.randomUUID().toString().replace("-", "");
            callRequest.setRoomId(roomId);
            callRequest.setStatus("ACCEPTED");
            callRequest.setRespondedAt(Instant.now());

            // Get expert rate for the interaction snapshot
            ExpertProfile expertProfile = expertProfileRepository.findByUserId(callRequest.getExpertId()).orElse(null);

            // Create an Interaction session
            Interaction interaction = Interaction.builder()
                    .clientId(callRequest.getClientId())
                    .expertId(callRequest.getExpertId())
                    .rateSnapshot(expertProfile != null ? expertProfile.getHourlyRate() : 0.0)
                    .startedAt(Instant.now())
                    .scheduledDurationMinutes(15)
                    .status(SessionStatus.ACTIVE)
                    .paymentStatus(PaymentStatus.UNPAID)
                    .build();
            interactionRepository.save(interaction);

            // Start the free trial
            sessionStateService.startFreeTrial(interaction);

            // Link interaction to call request
            callRequest.setInteractionId(interaction.getId());
            callRequestRepository.save(callRequest);

            log.info("Call ACCEPTED: callId={} roomId={} interactionId={}",
                     callRequest.getId(), roomId, interaction.getId());

        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            callRequest.setStatus("REJECTED");
            callRequest.setRejectReason(request.getRejectReason());
            callRequest.setRespondedAt(Instant.now());
            log.info("Call REJECTED: callId={} reason={}", callRequest.getId(), request.getRejectReason());
        } else {
            throw new IllegalArgumentException("Invalid action. Must be ACCEPT or REJECT");
        }

        callRequestRepository.save(callRequest);
        return toDto(callRequest);
    }

    /**
     * Client polls for call request status.
     */
    public CallRequestDto getCallRequestStatus(String callRequestId) {
        CallRequest callRequest = callRequestRepository.findById(callRequestId).orElse(null);
        if (callRequest == null) {
            throw new IllegalArgumentException("Call request not found");
        }
        return toDto(callRequest);
    }

    /**
     * Get the latest pending call request for an expert.
     */
    public CallRequestDto getPendingCallForExpert(String expertId) {
        var callRequest = callRequestRepository.findTopByExpertIdAndStatusOrderByCreatedAtDesc(expertId, "PENDING");
        return callRequest.map(this::toDto).orElse(null);
    }

    /**
     * Get the latest call for a client.
     */
    public CallRequestDto getLatestCallForClient(String clientId) {
        List<CallRequest> calls = callRequestRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        return calls.isEmpty() ? null : toDto(calls.get(0));
    }

    /**
     * End a call (set status to COMPLETED).
     */
    public CallRequestDto endCall(String callRequestId) {
        CallRequest callRequest = callRequestRepository.findById(callRequestId).orElse(null);
        if (callRequest == null) {
            throw new IllegalArgumentException("Call request not found");
        }
        callRequest.setStatus("COMPLETED");
        callRequest.setFeedbackPending(true);
        callRequest.setReviewSubmitted(false);
        callRequest.setRespondedAt(Instant.now());
        callRequestRepository.save(callRequest);

        // End the active interaction if exists
        if (callRequest.getInteractionId() != null) {
            interactionRepository.findById(callRequest.getInteractionId()).ifPresent(interaction -> {
                sessionStateService.endSession(interaction);
            });
        } else {
            // Fallback: find by client/expert
            List<Interaction> interactions = interactionRepository.findByExpertId(callRequest.getExpertId());
            for (Interaction interaction : interactions) {
                if (interaction.getStatus() != SessionStatus.COMPLETED
                        && interaction.getStatus() != SessionStatus.CANCELLED
                        && interaction.getStatus() != SessionStatus.FREE_SESSION_EXPIRED
                        && callRequest.getClientId().equals(interaction.getClientId())) {
                    sessionStateService.endSession(interaction);
                    break;
                }
            }
        }

        log.info("Call ENDED: callId={}", callRequestId);
        return toDto(callRequest);
    }

    /**
     * Client submits post-call rating and review.
     */
    public CallRequestDto submitRating(RatingRequest request) {
        CallRequest callRequest = callRequestRepository.findById(request.getCallRequestId()).orElse(null);
        if (callRequest == null) {
            throw new IllegalArgumentException("Call request not found");
        }
        if (Boolean.TRUE.equals(callRequest.getReviewSubmitted())) {
            throw new IllegalStateException("Rating has already been submitted and cannot be changed.");
        }
        callRequest.setRating(request.getRating());
        callRequest.setReview(request.getReview());
        callRequest.setReviewSubmitted(true);
        callRequest.setFeedbackPending(false);
        callRequestRepository.save(callRequest);
        log.info("Rating submitted: callId={} rating={}", request.getCallRequestId(), request.getRating());

        // Update expert's average rating atomically using MongoDB findAndModify.
        // Computes rating from ALL CallRequest reviews (source of truth) to avoid
        // read-modify-write race conditions on concurrent rating submissions.
        updateExpertRatingAtomically(callRequest.getExpertId());

        return toDto(callRequest);
    }

    /**
     * Get call history for a user (either client or expert).
     */
    public List<CallRequestDto> getCallHistory(String userId, String role) {
        List<CallRequest> calls;
        if ("CLIENT".equalsIgnoreCase(role)) {
            calls = callRequestRepository.findByClientIdOrderByCreatedAtDesc(userId);
        } else if ("EXPERT".equalsIgnoreCase(role)) {
            calls = callRequestRepository.findByExpertIdOrderByCreatedAtDesc(userId);
        } else {
            throw new IllegalArgumentException("Invalid role");
        }
        return calls.stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Atomically updates the expert's average rating and total review count
     * using MongoDB findAndModify. Computes from all CallRequest reviews
     * (source of truth) to eliminate read-modify-write race conditions.
     */
    private void updateExpertRatingAtomically(String expertId) {
        List<CallRequest> reviewed = callRequestRepository
                .findByExpertIdAndReviewSubmittedTrueOrderByCreatedAtDesc(expertId);
        int count = reviewed.size();
        double sum = 0;
        for (CallRequest cr : reviewed) {
            if (cr.getRating() != null) sum += cr.getRating();
        }
        double avg = count > 0 ? Math.round((sum / count) * 10.0) / 10.0 : 0.0;

        org.springframework.data.mongodb.core.query.Query query =
                new org.springframework.data.mongodb.core.query.Query(
                        org.springframework.data.mongodb.core.query.Criteria.where("userId").is(expertId));
        org.springframework.data.mongodb.core.query.Update update =
                new org.springframework.data.mongodb.core.query.Update()
                        .set("averageRating", avg)
                        .set("totalReviews", count);
        mongoTemplate.findAndModify(query, update, ExpertProfile.class);
        log.info("Expert rating updated atomically: expertId={} avg={} total={}", expertId, avg, count);
    }

    /**
     * Set expert status to BUSY or ONLINE.
     */
    public void setExpertStatus(String userId, String status) {
        ExpertProfile profile = expertProfileRepository.findByUserId(userId).orElse(null);
        if (profile != null) {
            if ("BUSY".equals(status)) {
                profile.setIsOnline(true);
                profile.setLastActivityAt(Instant.now());
                profile.setUpdatedAt(Instant.now());
                expertProfileRepository.save(profile);
                log.info("Expert status set to BUSY: userId={}", userId);
            } else if ("ONLINE".equals(status)) {
                profile.setIsOnline(true);
                profile.setLastActivityAt(Instant.now());
                profile.setUpdatedAt(Instant.now());
                expertProfileRepository.save(profile);
                log.info("Expert status set to ONLINE: userId={}", userId);
            }
        }
    }

    /**
     * Get all pending feedback for a client (calls that ended but no review submitted).
     * Uses clientEmail since the frontend AuthUser exposes email, not MongoDB ID.
     */
    public List<CallRequestDto> getPendingFeedbackForClient(String clientEmail) {
        List<CallRequest> allCalls = callRequestRepository.findByClientEmailOrderByCreatedAtDesc(clientEmail);
        return allCalls.stream()
                .filter(c -> "COMPLETED".equals(c.getStatus()) && Boolean.TRUE.equals(c.getFeedbackPending()))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Sends an email notification to the expert about a new call request.
     * Respects the expert's notification preferences — skips if they've
     * disabled consultation reminders or all email notifications.
     */
    private void sendCallRequestNotification(User expert, User client) {
        try {
            // Check notification preferences — skip if expert has disabled
            NotificationPreferences prefs = expert.getNotificationPreferences();
            if (prefs != null) {
                if (!prefs.isEmailNotifications()) {
                    log.info("Expert {} has disabled email notifications — skipping call request email", expert.getEmail());
                    return;
                }
                if (!prefs.isConsultationReminders()) {
                    log.info("Expert {} has disabled consultation reminders — skipping call request email", expert.getEmail());
                    return;
                }
            }

            String expertName = expert.getFullName() != null ? expert.getFullName() : expert.getFirstName();
            String clientName = client.getFullName() != null ? client.getFullName() : client.getFirstName();
            String clientEmail = client.getEmail();

            emailService.sendCallRequestNotification(
                    expert.getEmail(), expertName, clientName, clientEmail);
        } catch (Exception e) {
            // SILENT FAILURE — notification failure must never block the call request
            log.warn("Failed to send call request notification to expert {}: {}",
                    expert.getEmail(), e.getMessage());
        }
    }

    private CallRequestDto toDto(CallRequest callRequest) {
        CallRequestDto dto = new CallRequestDto();
        dto.setId(callRequest.getId());
        dto.setExpertId(callRequest.getExpertId());
        dto.setClientId(callRequest.getClientId());
        dto.setClientName(callRequest.getClientName());
        dto.setClientEmail(callRequest.getClientEmail());

        User expert = userRepository.findById(callRequest.getExpertId()).orElse(null);
        if (expert != null) {
            String fullName = expert.getFullName() != null ? expert.getFullName() : expert.getFirstName();
            dto.setExpertName(fullName);
        }

        dto.setRoomId(callRequest.getRoomId());
        dto.setStatus(callRequest.getStatus());
        dto.setRejectReason(callRequest.getRejectReason());
        dto.setCreatedAt(callRequest.getCreatedAt() != null ? callRequest.getCreatedAt().toString() : null);
        dto.setRespondedAt(callRequest.getRespondedAt() != null ? callRequest.getRespondedAt().toString() : null);
        dto.setRating(callRequest.getRating());
        dto.setReview(callRequest.getReview());
        dto.setReviewSubmitted(callRequest.getReviewSubmitted());
        dto.setFeedbackPending(callRequest.getFeedbackPending());
        dto.setInteractionId(callRequest.getInteractionId());
        return dto;
    }
}