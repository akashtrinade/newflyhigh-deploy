package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.exception.InvalidSessionStateException;
import com.flyhigh.backend.exception.PaymentVerificationException;
import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.SessionPaymentRepository;
import com.flyhigh.backend.repository.UserRepository;
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

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

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
    private final InteractionRepository interactionRepository;
    private final SessionPaymentRepository sessionPaymentRepository;
    private final UserRepository userRepository;

    public PaymentController(PaymentService paymentService, AuthService authService,
                             InteractionRepository interactionRepository,
                             SessionPaymentRepository sessionPaymentRepository,
                             UserRepository userRepository) {
        this.paymentService = paymentService;
        this.authService = authService;
        this.interactionRepository = interactionRepository;
        this.sessionPaymentRepository = sessionPaymentRepository;
        this.userRepository = userRepository;
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
                    .body(new MessageResponse(false, "Payment gateway error. Please try again."));
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
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            SessionStateResponse state = paymentService.verifyAndConfirmPayment(request, user.getId());
            return ResponseEntity.ok(state);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (PaymentVerificationException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (InvalidSessionStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Payment verification error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new MessageResponse(false, "Payment could not be verified. Please try again."));
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
                    .body(new MessageResponse(false, "Payment gateway error. Please try again."));
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
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            SessionStateResponse state = paymentService.verifyExtensionPayment(request, user.getId());
            return ResponseEntity.ok(state);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Extension verification error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(new MessageResponse(false, "Payment could not be verified. Please try again."));
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
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            SessionStateResponse state = paymentService.getSessionStateAuthorized(interactionId, user.getId());
            return ResponseEntity.ok(state);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse(false, e.getMessage()));
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
     * Get payment history for the authenticated client.
     * Returns paginated list of payments with expert names, amounts, and session status.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getPaymentHistory(Authentication authentication,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            // Get all interactions for this client
            List<Interaction> interactions = interactionRepository.findByClientId(user.getId());

            if (interactions.isEmpty()) {
                return ResponseEntity.ok(new ClientPaymentHistoryPage(
                        java.util.List.of(), 0, 0, page));
            }

            // Sort by startedAt descending (most recent first)
            interactions.sort((a, b) -> {
                Instant da = a.getStartedAt() != null ? a.getStartedAt() : Instant.EPOCH;
                Instant db = b.getStartedAt() != null ? b.getStartedAt() : Instant.EPOCH;
                return db.compareTo(da);
            });

            // Paginate
            long totalElements = interactions.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = page * size;
            int end = Math.min(start + size, interactions.size());
            List<Interaction> pageInteractions = start < interactions.size()
                    ? interactions.subList(start, end)
                    : java.util.List.of();

            if (pageInteractions.isEmpty()) {
                return ResponseEntity.ok(new ClientPaymentHistoryPage(
                        java.util.List.of(), totalElements, totalPages, page));
            }

            // Batch-load session payments for this page of interactions
            List<String> interactionIds = pageInteractions.stream()
                    .map(Interaction::getId).collect(Collectors.toList());
            Map<String, List<SessionPayment>> paymentsByInteraction =
                    sessionPaymentRepository.findByInteractionIdIn(interactionIds)
                            .stream().collect(Collectors.groupingBy(SessionPayment::getInteractionId));

            // Batch-load expert users
            Set<String> expertIds = pageInteractions.stream()
                    .map(Interaction::getExpertId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            Map<String, User> expertMap = userRepository.findAllById(expertIds)
                    .stream().collect(Collectors.toMap(User::getId, Function.identity()));

            // Build DTOs
            List<ClientPaymentHistoryDto> dtos = new ArrayList<>();
            for (Interaction interaction : pageInteractions) {
                List<SessionPayment> payments = paymentsByInteraction
                        .getOrDefault(interaction.getId(), java.util.List.of());

                // Get expert name
                String expertName = "Unknown Expert";
                User expert = expertMap.get(interaction.getExpertId());
                if (expert != null) {
                    expertName = expert.getFullName() != null ? expert.getFullName() : expert.getEmail();
                }

                // Session date
                String sessionDate = "";
                if (interaction.getStartedAt() != null) {
                    sessionDate = DateTimeFormatter.ISO_INSTANT.format(interaction.getStartedAt());
                }

                // Duration: use actual if completed, otherwise scheduled
                int duration = interaction.getActualDurationMinutes() != null
                        ? interaction.getActualDurationMinutes()
                        : (interaction.getScheduledDurationMinutes() != null
                                ? interaction.getScheduledDurationMinutes() : 0);

                // Total paid amount
                double totalPaid = interaction.getTotalPaidAmount() != null
                        ? interaction.getTotalPaidAmount() : 0;

                // Razorpay payment ID (from the most recent successful payment)
                String razorpayPaymentId = null;
                String paymentType = null;
                for (SessionPayment sp : payments) {
                    if ("SUCCESS".equals(sp.getStatus())) {
                        razorpayPaymentId = sp.getTransactionId();
                        paymentType = sp.getType() != null ? sp.getType().name() : "INITIAL";
                    }
                }

                dtos.add(new ClientPaymentHistoryDto(
                        interaction.getId(),
                        interaction.getId(),
                        expertName,
                        interaction.getExpertId(),
                        sessionDate,
                        duration,
                        totalPaid,
                        interaction.getStatus() != null ? interaction.getStatus().name() : "UNKNOWN",
                        interaction.getPaymentStatus() != null ? interaction.getPaymentStatus().name() : "UNPAID",
                        razorpayPaymentId,
                        paymentType
                ));
            }

            return ResponseEntity.ok(new ClientPaymentHistoryPage(
                    dtos, totalElements, totalPages, page));
        } catch (Exception e) {
            log.error("Payment history error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse(false, "Failed to load payment history."));
        }
    }
}
