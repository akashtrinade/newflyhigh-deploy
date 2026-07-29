package com.flyhigh.backend.security;

import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.CustomUserDetailsService;
import org.springframework.context.annotation.Lazy;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security Configuration.
 *
 * SECURITY FEATURES:
 * 1. CORS with strict origin whitelist
 * 2. CSRF disabled for stateless API
 * 3. Stateless sessions (no HttpSession)
 * 4. JWT authentication filter
 * 5. Role-based access control via @PreAuthorize
 * 6. HTTP-only cookies for token storage
 * 7. BCryptPasswordEncoder with configurable strength
 * 8. Rate limiting filter
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    // Controls whether the unauthenticated /api/dev/** dev routes are exposed.
    // Defaults to true so local dev works out of the box.
    // Set APP_DEV_MODE=false in production to lock down dev routes entirely.
    @Value("${app.dev-mode-enabled:true}")
    private boolean devModeEnabled;

        private final JwtAuthenticationFilter jwtAuthFilter;
    private final JwtEntryPoint jwtEntryPoint;
    private final CustomUserDetailsService userDetailsService;
    private final AuthService authService;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${bcrypt.strength:12}")
    private int bcryptStrength;

        public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter,
                          JwtEntryPoint jwtEntryPoint,
                          CustomUserDetailsService userDetailsService,
                          @Lazy AuthService authService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.jwtEntryPoint = jwtEntryPoint;
        this.userDetailsService = userDetailsService;
        this.authService = authService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CORS with strict origin whitelist
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // CSRF disabled for stateless JWT API
            .csrf(csrf -> csrf.disable())

            // Stateless session (no HttpSession)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Exception handling
            .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtEntryPoint))

                        // Route permissions
            .authorizeHttpRequests(auth -> {
                // Public auth endpoints (except /me which needs auth)
                auth.requestMatchers("/api/auth/signup", "/api/auth/verify-signup-otp",
                    "/api/auth/resend-signup-otp", "/api/auth/login",
                    "/api/auth/google-login",
                    "/api/auth/complete-google-registration",
                    "/api/auth/forgot-password", "/api/auth/verify-reset-otp",
                    "/api/auth/reset-password").permitAll();

                // Dev/debug endpoints — ONLY in dev mode.
                // APP_DEV_MODE defaults to true for local dev convenience.
                // Set APP_DEV_MODE=false in staging/production.
                if (devModeEnabled) {
                    auth.requestMatchers("/api/dev/**").permitAll();
                }

                // Public contact form (no auth required)
                auth.requestMatchers("/api/contact/send").permitAll();

                // Razorpay webhook (HMAC-verified, no JWT needed)
                auth.requestMatchers("/api/webhooks/razorpay").permitAll();

                    // /api/auth/me, /api/auth/refresh, /api/auth/logout, /api/auth/heartbeat require authentication
                    auth.requestMatchers("/api/auth/me", "/api/auth/refresh", "/api/auth/logout", "/api/auth/heartbeat").authenticated();
                    // Public health check endpoints (actuator)
                    auth.requestMatchers("/health", "/info", "/actuator/health/**", "/actuator/info").permitAll();
                    // Public static resources and health
                    auth.requestMatchers("/", "/favicon.ico", "/error").permitAll();
                    // Everything else requires authentication
                    auth.anyRequest().authenticated();
            })

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                        // Logout handler — clears cookies and sets expert OFFLINE
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    // Set expert OFFLINE before clearing cookies
                    if (authentication != null && authentication.isAuthenticated()) {
                        String email = authentication.getName();
                        if (email != null) {
                            authService.setExpertOffline(email);
                        }
                    }
                    clearAuthCookies(response);
                    response.setContentType("application/json");
                    response.getWriter().write("""
                            { "success": true, "message": "Logged out" }
                            """);
                })
                .permitAll()
            );

        return http.build();
    }

    /**
     * CORS configuration with strict origin whitelist.
     * Only allows configured origins (default: localhost:5173, localhost:3000).
     * In production, set CORS_ORIGINS env var to your actual domain.
     *
     * SECURITY: Rejects wildcard (*) origins when allowCredentials=true
     * (browsers block this combination per the Fetch spec).
     * Production deployments MUST set explicit origin(s).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        // Security: Reject wildcard in production when credentials are enabled
        if (origins.contains("*")) {
            if ("prod".equalsIgnoreCase(
                    System.getProperty("spring.profiles.active", "dev"))) {
                throw new IllegalStateException(
                        "CORS origin '*' is not allowed in production with credentials. "
                        + "Set CORS_ORIGINS to your actual domain(s).");
            }
            // In dev, log warning and replace with default localhost origins
            System.err.println("[SECURITY WARNING] CORS origin '*' detected. "
                    + "Using default localhost origins for dev safety.");
            origins = List.of("http://localhost:5173", "http://localhost:3000","https://newflyhigh-deploy-am5u-wwfzj1agx.vercel.app/");
        }

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-Idempotency-Key"));
        config.setAllowCredentials(true); // Required for cookies
        config.setMaxAge(3600L); // Cache preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        // Strength 12 = ~250ms per hash, strong against brute-force
        return new BCryptPasswordEncoder(bcryptStrength);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    /**
     * Clears access + refresh cookies on logout.
     */
    private void clearAuthCookies(HttpServletResponse response) {
        Cookie accessCookie = new Cookie("accessToken", null);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(cookieSecure);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0);

        Cookie refreshCookie = new Cookie("refreshToken", null);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(cookieSecure);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
    }
}
