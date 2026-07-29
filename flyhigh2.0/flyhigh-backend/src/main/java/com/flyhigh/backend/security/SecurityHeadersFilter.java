package com.flyhigh.backend.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Adds security HTTP headers to every response.
 *
 * Headers implemented:
 * - Strict-Transport-Security (HSTS): enforce HTTPS for 1 year
 * - X-Content-Type-Options: prevent MIME sniffing
 * - X-Frame-Options: prevent clickjacking
 * - X-XSS-Protection: block reflected XSS (legacy browser support)
 * - Content-Security-Policy: restrict resource loading origins
 * - Referrer-Policy: control referrer information leakage
 * - Cache-Control: prevent caching of sensitive API responses
 *
 * Runs early in the filter chain (Order 2, after rate limiter).
 */
@Component
@Order(2)
public class SecurityHeadersFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(SecurityHeadersFilter.class);

    @Value("${app.security.hsts-max-age:31536000}")
    private long hstsMaxAge;

    @Value("${app.security.csp-policy:default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.razorpay.com wss:; frame-src 'self' https://api.razorpay.com; font-src 'self'}")
    private String cspPolicy;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                        FilterChain chain) throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // HSTS: enforce HTTPS (only in production with HTTPS)
        httpResponse.setHeader("Strict-Transport-Security",
                "max-age=" + hstsMaxAge + "; includeSubDomains");

        // Prevent MIME type sniffing
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");

        // Prevent clickjacking
        httpResponse.setHeader("X-Frame-Options", "DENY");

        // Legacy XSS protection
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");

        // Content Security Policy
        httpResponse.setHeader("Content-Security-Policy", cspPolicy);

        // Referrer policy: only send referrer for same-origin
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Prevent caching of API responses (sensitive data)
        httpResponse.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
        httpResponse.setHeader("Pragma", "no-cache");

        // Remove server fingerprinting header (if present from embedded server)
        httpResponse.setHeader("Server", "");

        chain.doFilter(request, response);
    }

    @Override
    public void init(FilterConfig filterConfig) {
        log.info("Security headers filter initialized: HSTS={}s CSP={}",
                hstsMaxAge, cspPolicy.substring(0, Math.min(60, cspPolicy.length())) + "...");
    }
}
