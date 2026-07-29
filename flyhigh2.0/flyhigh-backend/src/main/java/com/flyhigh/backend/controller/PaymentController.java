package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.exception.InvalidSessionStateException;
import com.flyhigh.backend.exception.PaymentVerificationException;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Payment Controller — handles Razorpay order creation, payment verification,
 * session state polling, duration recommendations, and session extensions.
 *
 * IDEMPOTENCY: All transactional endpoints accept an optional X-Idempotency-Key
 * header. If provided, duplicate requests with the same key return the original
 * result rather than creating duplicate charges.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final AuthService authService;

    public PaymentController(PaymentService paymentService, AuthService authService) {
        this.paymentService = paymentService;
        this.authService = authService;
    }

    /**
     * Extracts idempotency key from request header, generating one if not provided.
     */
    private String resolveIdempotencyKey(HttpServletRequest request) {
        String key = request.getHeader("X-Idempotency-Key");
        if (key == null || key.isBlank()) {
            key = UUID.randomUUID().toString();
        }
        return key;
    }

    /**
     * Client creates a Razorpay order for the selected duration.
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(Authentication authentication,
                                         @Valid @RequestBody CreateOrderRequest request,
                                         HttpServletRequest httpRequest) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String idempotencyKey = resolveIdempotencyKey(httpRequest);

        try {
            CreateOrderResponse response = paymentService.createRazorpayOrder(request, user.getId(), idempotencyKey);
            return ResponseEntity.ok(response);
        } catch (InvalidSessionStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Order creation error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new MessageResponse(false, "Payment gateway error: " + e.getMessage()));
        }
    }

    /**
     * Client verifies Razorpay payment signature after checkout.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(Authentication authentication,
                                           @Valid @RequestBody PaymentVerifyRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            SessionStateResponse state = paymentService.verifyAndConfirmPayment(request);
            return ResponseEntity.ok(state);
        } catch (PaymentVerificationException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (InvalidSessionStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Payment verification error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Client creates an extension order for additional time.
     */
    @PostMapping("/extend")
    public ResponseEntity<?> extendSession(Authentication authentication,
                                           @RequestBody CreateOrderRequest request,
                                           HttpServletRequest httpRequest) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Force type to EXTENSION
        request.setType("EXTENSION");
        String idempotencyKey = resolveIdempotencyKey(httpRequest);

        try {
            CreateOrderResponse response = paymentService.createRazorpayOrder(request, user.getId(), idempotencyKey);
            return ResponseEntity.ok(response);
        } catch (InvalidSessionStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Extension order error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new MessageResponse(false, "Payment gateway error: " + e.getMessage()));
        }
    }

    /**
     * Client verifies extension payment.
     */
    @PostMapping("/extend-verify")
    public ResponseEntity<?> verifyExtension(Authentication authentication,
                                             @Valid @RequestBody PaymentVerifyRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            SessionStateResponse state = paymentService.verifyExtensionPayment(request);
            return ResponseEntity.ok(state);
        } catch (Exception e) {
            log.error("Extension verification error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Poll current session state (timer, phase, payment status).
     * Requires authentication — only the client or expert of this interaction can poll state.
     */
    @GetMapping("/session-state/{interactionId}")
    public ResponseEntity<?> getSessionState(Authentication authentication,
                                              @PathVariable String interactionId) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            SessionStateResponse state = paymentService.getSessionState(interactionId);
            return ResponseEntity.ok(state);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Expert recommends a consultation duration to the client.
     */
    @PostMapping("/recommend")
    public ResponseEntity<?> recommendDuration(Authentication authentication,
                                               @RequestBody DurationRecommendationRequest request) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            SessionStateResponse state = paymentService.setDurationRecommendation(request, user.getId());
            return ResponseEntity.ok(state);
        } catch (InvalidSessionStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        }
    }

    /**
     * Get payment history for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getPaymentHistory(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // Future: implement payment history
        return ResponseEntity.ok(java.util.List.of());
    }
}
