package com.flyhigh.backend.security;

import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.UserRepository;
import com.flyhigh.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT Authentication Filter.
 *
 * Extracts JWT from:
 * 1. HTTP-only cookie (primary — for web clients)
 * 2. Authorization: Bearer header (fallback — for testing/mobile)
 *
 * SECURITY HARDENING:
 * - Validates tokenVersion claim against stored user.tokenVersion.
 *   If the token's version is stale (user logged out elsewhere or changed password),
 *   the token is rejected. This provides server-side token invalidation.
 * - Sets SecurityContext with user details for downstream filters.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = extractJwtFromCookie(request);

        if (jwt == null) {
            jwt = extractJwtFromHeader(request);
        }

        if (jwt != null && jwtService.validateToken(jwt)) {
            String email = jwtService.extractEmail(jwt);
            String role = jwtService.extractRole(jwt);

            // ── Token version check (server-side invalidation) ──
            Long tokenVersion = jwtService.extractTokenVersion(jwt);
            if (tokenVersion != null && email != null) {
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    Long currentVersion = user.getTokenVersion();
                    if (currentVersion != null && !currentVersion.equals(tokenVersion)) {
                        log.warn("JWT rejected: token version mismatch for {} (token={}, current={})",
                                email, tokenVersion, currentVersion);
                        // Don't set SecurityContext — request will be treated as unauthenticated
                        filterChain.doFilter(request, response);
                        return;
                    }

                    // Also check account is active
                    if (!Boolean.TRUE.equals(user.getIsActive())) {
                        log.warn("JWT rejected: account deactivated for {}", email);
                        filterChain.doFilter(request, response);
                        return;
                    }
                }
            }

            // Create authorities from role
            List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + role)
            );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(email, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extracts JWT from the "accessToken" cookie.
     */
    private String extractJwtFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if ("accessToken".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    /**
     * Extracts JWT from "Authorization: Bearer <token>" header.
     */
    private String extractJwtFromHeader(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
