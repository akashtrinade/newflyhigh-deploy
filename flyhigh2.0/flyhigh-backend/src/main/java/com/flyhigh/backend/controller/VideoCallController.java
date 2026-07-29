package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.model.User;
import jakarta.validation.Valid;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.VideoCallService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Video Call Controller.
 *
 * ENDPOINTS:
 * - POST /api/video-call/request              → Client creates a call request
 * - POST /api/video-call/respond               → Expert accepts/rejects a call
 * - GET  /api/video-call/status/{id}           → Client polls call status
 * - GET  /api/video-call/pending/{expertId}   → Expert checks pending call
 * - GET  /api/video-call/latest               → Client gets latest call
 * - POST /api/video-call/end                   → End a call
 * - POST /api/video-call/rating                → Submit post-call rating
 * - GET  /api/video-call/history               → Get call history
 * - POST /api/video-call/expert/{userId}/status → Set expert status
 * - GET  /api/video-call/expert/{userId}/email  → Get expert email by userId
 */
@RestController
@RequestMapping("/api/video-call")
public class VideoCallController {

    private static final Logger log = LoggerFactory.getLogger(VideoCallController.class);

    private final VideoCallService videoCallService;
    private final AuthService authService;

    public VideoCallController(VideoCallService videoCallService, AuthService authService) {
        this.videoCallService = videoCallService;
        this.authService = authService;
    }

    /**
     * Client initiates a call request to an expert.
     */
    @PostMapping("/request")
    public ResponseEntity<?> createCallRequest(Authentication authentication,
                                                @RequestBody Map<String, String> body) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String clientEmail = authentication.getName();
        User client = authService.getUserByEmail(clientEmail);
        if (client == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String expertId = body.get("expertId");
        if (expertId == null || expertId.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, "expertId is required"));
        }

        try {
            CallRequestDto dto = videoCallService.createCallRequest(client.getId(), expertId);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Expert accepts or rejects a call.
     */
    @PostMapping("/respond")
    public ResponseEntity<?> respondToCall(Authentication authentication,
                                            @Valid @RequestBody CallActionRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            CallRequestDto dto = videoCallService.respondToCall(request);

            // If accepted, set expert status to BUSY
            if ("ACCEPT".equalsIgnoreCase(request.getAction())) {
                String expertEmail = authentication.getName();
                User expert = authService.getUserByEmail(expertEmail);
                if (expert != null) {
                    videoCallService.setExpertStatus(expert.getId(), "BUSY");
                }
            }

            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Client polls for call request status.
     * Requires authentication — only the client who created the call can check its status.
     */
    @GetMapping("/status/{callRequestId}")
    public ResponseEntity<?> getCallStatus(Authentication authentication,
                                           @PathVariable String callRequestId) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            CallRequestDto dto = videoCallService.getCallRequestStatus(callRequestId);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Get the latest pending call for an expert.
     * Requires authentication — only the expert themselves can check their pending calls.
     */
    @GetMapping("/pending/{expertId}")
    public ResponseEntity<?> getPendingCall(Authentication authentication,
                                            @PathVariable String expertId) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        CallRequestDto dto = videoCallService.getPendingCallForExpert(expertId);
        return ResponseEntity.ok(dto != null ? dto : new java.util.HashMap<>());
    }

    /**
     * Get the latest call for the authenticated client.
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestCall(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        CallRequestDto dto = videoCallService.getLatestCallForClient(user.getId());
        return ResponseEntity.ok(dto != null ? dto : new java.util.HashMap<>());
    }

    /**
     * End a call.
     */
    @PostMapping("/end")
    public ResponseEntity<?> endCall(Authentication authentication,
                                      @RequestBody Map<String, String> body) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String callRequestId = body.get("callRequestId");
        if (callRequestId == null || callRequestId.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, "callRequestId is required"));
        }

        try {
            CallRequestDto dto = videoCallService.endCall(callRequestId);

            // Set expert back to ONLINE after call ends
            String userEmail = authentication.getName();
            User user = authService.getUserByEmail(userEmail);
            if (user != null && "EXPERT".equalsIgnoreCase(user.getRole())) {
                videoCallService.setExpertStatus(user.getId(), "ONLINE");
            }

            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Submit post-call rating and review.
     * Requires authentication — rating is immutable once submitted.
     */
    @PostMapping("/rating")
    public ResponseEntity<?> submitRating(Authentication authentication,
                                           @Valid @RequestBody RatingRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            CallRequestDto dto = videoCallService.submitRating(request);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Get call history for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getCallHistory(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<CallRequestDto> history = videoCallService.getCallHistory(user.getId(), user.getRole());
        return ResponseEntity.ok(history);
    }

    /**
     * Set expert online status (BUSY/ONLINE).
     * Requires authentication — only the expert themselves can set their status.
     */
    @PostMapping("/expert/{userId}/status")
    public ResponseEntity<MessageResponse> setExpertStatus(Authentication authentication,
                                                            @PathVariable String userId,
                                                            @RequestBody Map<String, String> body) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String status = body.get("status");
        if (status == null || (!"BUSY".equals(status) && !"ONLINE".equals(status))) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, "Status must be BUSY or ONLINE"));
        }
        videoCallService.setExpertStatus(userId, status);
        return ResponseEntity.ok(new MessageResponse(true, "Expert status updated to " + status));
    }

    /**
     * Get pending feedback for a client (calls that ended without review).
     * Requires authentication — only the client themselves can see their pending feedback.
     */
    @GetMapping("/pending-feedback/{clientEmail}")
    public ResponseEntity<?> getPendingFeedback(Authentication authentication,
                                                @PathVariable String clientEmail) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<CallRequestDto> pending = videoCallService.getPendingFeedbackForClient(clientEmail);
        return ResponseEntity.ok(pending != null ? pending : List.of());
    }

    /**
     * Get session (interaction) details for a call request.
     * Requires authentication — only the participants can view session details.
     */
    @GetMapping("/session/{callRequestId}")
    public ResponseEntity<?> getSessionByCallRequest(Authentication authentication,
                                                      @PathVariable String callRequestId) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            CallRequestDto dto = videoCallService.getCallRequestStatus(callRequestId);
            if (dto.getInteractionId() == null) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "interactionId", "",
                    "message", "No interaction linked yet"
                ));
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "interactionId", dto.getInteractionId(),
                "callRequestId", callRequestId,
                "status", dto.getStatus()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Get expert email by their MongoDB user ID.
     * Requires authentication — only authenticated users can look up expert emails.
     */
    @GetMapping("/expert/{userId}/email")
    public ResponseEntity<?> getExpertEmail(Authentication authentication,
                                            @PathVariable String userId) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserById(userId);
        if (user == null) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, "Expert not found"));
        }
        return ResponseEntity.ok(Map.of("email", user.getEmail()));
    }
}