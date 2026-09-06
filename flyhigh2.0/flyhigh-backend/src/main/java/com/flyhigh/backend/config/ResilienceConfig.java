package com.flyhigh.backend.config;

import com.razorpay.RazorpayException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Resilience4j configuration for hardening Razorpay payment gateway calls.
 *
 * Circuit breaker prevents cascading failures when Razorpay is degraded.
 * Retry with exponential backoff handles transient network errors and rate limits
 * without overwhelming the gateway.
 */
@Configuration
public class ResilienceConfig {

    private static final Logger log = LoggerFactory.getLogger(ResilienceConfig.class);

    // ── Circuit Breaker ───────────────────────────────────────────

    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
                .failureRateThreshold(50)           // Open if 50% of calls fail
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .slidingWindowSize(10)               // Last 10 calls determine state
                .minimumNumberOfCalls(5)              // Don't evaluate before 5 calls
                .recordExceptions(RazorpayException.class, RuntimeException.class)
                .build();

        log.info("Resilience4j circuit breaker registered: failureRateThreshold=50% "
                + "waitDurationInOpenState=30s slidingWindowSize=10 minimumNumberOfCalls=5");

        return CircuitBreakerRegistry.of(config);
    }

    @Bean
    public CircuitBreaker razorpayCircuitBreaker(CircuitBreakerRegistry registry) {
        return registry.circuitBreaker("razorpayCircuitBreaker");
    }

    /** Circuit breaker for RazorpayX payout gateway calls (same policy as payments). */
    @Bean
    public CircuitBreaker razorpayxCircuitBreaker(CircuitBreakerRegistry registry) {
        return registry.circuitBreaker("razorpayxCircuitBreaker");
    }

    // ── Retry ─────────────────────────────────────────────────────

    @Bean
    public RetryRegistry retryRegistry() {
        RetryConfig config = RetryConfig.custom()
                .maxAttempts(3)                       // 1 initial + 2 retries
                .intervalFunction(IntervalFunction.ofExponentialBackoff(      // 1s → 2s → 4s
                        Duration.ofSeconds(1), 2.0))
                .retryExceptions(RazorpayException.class, RuntimeException.class)
                .ignoreExceptions(
                        IllegalArgumentException.class,
                        org.springframework.dao.DataIntegrityViolationException.class
                )
                .build();

        log.info("Resilience4j retry registered: maxAttempts=3 waitDuration=1s "
                + "exponentialBackoffMultiplier=2");

        return RetryRegistry.of(config);
    }

    @Bean
    public Retry razorpayRetry(RetryRegistry registry) {
        return registry.retry("razorpayRetry");
    }

    /**
     * Retry for RazorpayX payout gateway calls. Same backoff as payments, but
     * only retries transient failures (5xx/network) — 4xx validation errors
     * from the gateway fail fast instead of burning 3 attempts.
     */
    @Bean
    public Retry razorpayxRetry(RetryRegistry registry) {
        RetryConfig config = RetryConfig.custom()
                .maxAttempts(3)
                .intervalFunction(IntervalFunction.ofExponentialBackoff(
                        Duration.ofSeconds(1), 2.0))
                .retryOnException(e -> e instanceof com.flyhigh.backend.exception.RazorpayXException rxe
                        && rxe.isRetryable())
                .ignoreExceptions(
                        IllegalArgumentException.class,
                        org.springframework.dao.DataIntegrityViolationException.class
                )
                .build();
        registry.addConfiguration("razorpayxRetryConfig", config);
        return registry.retry("razorpayxRetry", "razorpayxRetryConfig");
    }
}
