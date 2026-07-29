package com.flyhigh.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * JWT Authentication Entry Point.
 *
 * Handles unauthorized access attempts by sending a 401 response.
 * This is triggered when:
 * - No JWT token is provided for a protected route
 * - The JWT token is expired or invalid
 * - The user doesn't have the required role
 */
@Component
public class JwtEntryPoint implements AuthenticationEntryPoint {

    private static final Logger log = LoggerFactory.getLogger(JwtEntryPoint.class);

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException)
            throws IOException {

        log.warn("Unauthorized access attempt to {}: {}",
                request.getRequestURI(), authException.getMessage());

        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("""
                {
                    "success": false,
                    "message": "Unauthorized. Please log in."
                }
                """);
    }
}
