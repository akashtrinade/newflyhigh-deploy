package com.flyhigh.backend.controller;

import com.flyhigh.backend.model.Dispute;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.DisputeService;
import com.flyhigh.backend.service.RefundService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DisputeController {

    private final DisputeService disputeService;
    private final RefundService refundService;
    private final AuthService authService;

    public DisputeController(DisputeService disputeService,
                              RefundService refundService,
                              AuthService authService) {
        this.disputeService = disputeService;
        this.refundService = refundService;
        this.authService = authService;
    }

    /**
     * Client raises a dispute against a completed session.
     */
    @PostMapping("/disputes")
    public ResponseEntity<?> createDispute(@RequestBody Map<String, String> body,
                                            Authentication authentication) {
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "User not found"));
        }
        String interactionId = body.get("interactionId");
        String reason = body.get("reason");
        String statement = body.getOrDefault("statement", "");

        if (interactionId == null || reason == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "interactionId and reason are required"));
        }

        try {
            Dispute dispute = disputeService.createDispute(interactionId, user.getId(), reason, statement);
            return ResponseEntity.ok(Map.of("success", true, "dispute", dispute));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", e.getMessage()));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Client views their own disputes.
     */
    @GetMapping("/disputes/my")
    public ResponseEntity<?> getMyDisputes(Authentication authentication) {
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "User not found"));
        }
        List<Dispute> disputes = disputeService.getClientDisputes(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "disputes", disputes));
    }

    /**
     * Request a refund for a completed session.
     */
    @PostMapping("/refunds/request")
    public ResponseEntity<?> requestRefund(@RequestBody Map<String, String> body,
                                            Authentication authentication) {
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "User not found"));
        }
        String interactionId = body.get("interactionId");
        String reason = body.get("reason");

        if (interactionId == null || reason == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "interactionId and reason are required"));
        }

        try {
            var refund = refundService.requestClientRefund(interactionId, user.getId(), reason);
            return ResponseEntity.ok(Map.of("success", true, "refund", refund));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", e.getMessage()));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Refund request failed"));
        }
    }
}
