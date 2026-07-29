package com.flyhigh.backend.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiter Filter using Bucket4j.
 *
 * SECURITY: Two-tier rate limiting:
 * 1. Per-IP bucket (10 req/s) — prevents DDoS
 * 2. Per-endpoint buckets for sensitive paths — prevents brute-force:
 *    - Login/signup: 5 req/min per IP
 *    - OTP endpoints: 3 req/min per IP
 *    - Password reset: 3 req/min per IP
 *
 * NOTE: In production, use Redis-based buckets instead of in-memory
 * for resilience across multiple instances.
 */
@Component
@Order(1)
public class RateLimiterFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterFilter.class);

    // Global per-IP buckets (10 req/s)
    private final Map<String, Bucket> globalBuckets = new ConcurrentHashMap<>();

    // Sensitive endpoint per-IP buckets (stricter limits)
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> otpBuckets = new ConcurrentHashMap<>();

    // Sensitive path patterns
    private static final String PATH_LOGIN = "/api/auth/login";
    private static final String PATH_SIGNUP = "/api/auth/signup";
    private static final String PATH_FORGOT = "/api/auth/forgot-password";
    private static final String PATH_RESET = "/api/auth/reset-password";
    private static final String PATH_VERIFY_OTP = "/api/auth/verify-signup-otp";
    private static final String PATH_RESEND_OTP = "/api/auth/resend-signup-otp";
    private static final String PATH_VERIFY_RESET = "/api/auth/verify-reset-otp";

    @Override
    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain filterChain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();

        // ── Tier 1: Global rate limit (10 req/s per IP) ──
        Bucket globalBucket = globalBuckets.computeIfAbsent(clientIp, this::createGlobalBucket);
        if (!globalBucket.tryConsume(1)) {
            log.warn("Global rate limit exceeded for IP: {} on {}", clientIp, path);
            sendRateLimitResponse(response, "Too many requests. Please slow down.");
            return;
        }

        // ── Tier 2: Sensitive endpoint rate limits ──
        if (isAuthPath(path)) {
            Bucket authBucket = authBuckets.computeIfAbsent(clientIp, this::createAuthBucket);
            if (!authBucket.tryConsume(1)) {
                log.warn("Auth rate limit exceeded for IP: {} on {}", clientIp, path);
                sendRateLimitResponse(response, "Too many authentication attempts. Please try again later.");
                return;
            }
        }

        if (isOtpPath(path)) {
            Bucket otpBucket = otpBuckets.computeIfAbsent(clientIp, this::createOtpBucket);
            if (!otpBucket.tryConsume(1)) {
                log.warn("OTP rate limit exceeded for IP: {} on {}", clientIp, path);
                sendRateLimitResponse(response, "Too many OTP requests. Please try again later.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    // ── Bucket factories ─────────────────────────────────────

    /** Global: 10 requests per second */
    private Bucket createGlobalBucket(String ip) {
        Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofSeconds(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    /** Auth endpoints: 5 requests per minute (prevents credential stuffing) */
    private Bucket createAuthBucket(String ip) {
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    /** OTP endpoints: 3 requests per minute (prevents OTP spam) */
    private Bucket createOtpBucket(String ip) {
        Bandwidth limit = Bandwidth.classic(3, Refill.greedy(3, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    // ── Path helpers ─────────────────────────────────────────

    private boolean isAuthPath(String path) {
        return path != null && (
                path.equals(PATH_LOGIN) ||
                path.equals(PATH_SIGNUP) ||
                path.equals(PATH_FORGOT) ||
                path.equals(PATH_RESET)
        );
    }

    private boolean isOtpPath(String path) {
        return path != null && (
                path.equals(PATH_VERIFY_OTP) ||
                path.equals(PATH_RESEND_OTP) ||
                path.equals(PATH_VERIFY_RESET)
        );
    }

    // ── Response ─────────────────────────────────────────────

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setContentType("application/json");
        response.setStatus(429);
        response.getWriter().write(String.format("""
                {
                    "success": false,
                    "message": "%s"
                }
                """, message));
    }

    // ── IP extraction ────────────────────────────────────────

    /**
     * Extracts the real client IP, accounting for proxies and load balancers.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
