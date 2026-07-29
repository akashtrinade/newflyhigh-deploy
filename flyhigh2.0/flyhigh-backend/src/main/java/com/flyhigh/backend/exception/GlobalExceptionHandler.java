package com.flyhigh.backend.exception;

import com.razorpay.RazorpayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler that returns structured JSON errors.
 * SECURITY: Never exposes internal error details or stack traces to the client.
 * All error messages returned to clients are static/generic to prevent
 * information leakage (DB URIs, classpaths, Razorpay internals, user enumeration).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Validation failed");
        response.put("errors", errors);
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(
            AuthenticationException ex) {
        log.warn("Authentication failed: {}", ex.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Authentication failed");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(PaymentVerificationException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentVerificationException(
            PaymentVerificationException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(InvalidSessionStateException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidSessionStateException(
            InvalidSessionStateException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(RazorpayException.class)
    public ResponseEntity<Map<String, Object>> handleRazorpayException(
            RazorpayException ex) {
        log.error("Razorpay gateway error: {}", ex.getMessage(), ex);
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Payment gateway error. Please try again.");
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);

        return ResponseEntity.status(500)
            .body(Map.of(
                "success", false,
                "message", "An unexpected error occurred. Please try again later."
            ));
    }
}
