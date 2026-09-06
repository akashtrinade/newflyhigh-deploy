package com.flyhigh.backend.config;

import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.HandshakeData;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.Configuration;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.UserRepository;
import com.flyhigh.backend.service.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.util.HashMap;
import java.util.Map;

@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    private static final Logger log = LoggerFactory.getLogger(SocketIOConfig.class);

    @Value("${socketio.payment.port:8085}")
    private int port;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000}")
    private String allowedOrigins;

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final InteractionRepository interactionRepository;

    public SocketIOConfig(JwtService jwtService,
                          UserRepository userRepository,
                          InteractionRepository interactionRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.interactionRepository = interactionRepository;
    }

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setPort(port);
        config.setOrigin(allowedOrigins);
        config.setHostname("0.0.0.0");
        config.setMaxFramePayloadLength(1024 * 1024);
        config.setMaxHttpContentLength(1024 * 1024);

        // ── JWT authorization on handshake ─────────────────────
        // The accessToken is an httpOnly cookie, so browsers send it automatically
        // on the WebSocket handshake (cookies are domain-scoped, not port-scoped).
        // Query-param fallback mirrors the signaling server's pattern for tooling.
        config.setAuthorizationListener(this::authorizePaymentSocket);

        SocketIOServer server = new SocketIOServer(config);

        server.addConnectListener(client -> {
            log.info("Payment socket client connected: {} (user={})",
                    client.getSessionId(), client.get("email"));
        });

        server.addDisconnectListener(client -> {
            log.info("Payment socket client disconnected: {}", client.getSessionId());
        });

        server.addEventListener("join-session", String.class, (client, interactionId, ackRequest) -> {
            String userId = client.get("userId");
            String email = client.get("email");
            if (userId == null || email == null) {
                log.warn("[SECURITY] Payment socket: unauthenticated join-session from {}", client.getSessionId());
                client.sendEvent("error", "Authentication required.");
                client.disconnect();
                return;
            }

            Interaction interaction = interactionRepository.findById(interactionId).orElse(null);
            if (interaction == null) {
                client.sendEvent("error", "Session not found.");
                return;
            }

            boolean participant = userId.equals(interaction.getClientId())
                    || userId.equals(interaction.getExpertId());
            if (!participant) {
                log.warn("[SECURITY] Payment socket: user {} ({}) attempted to join session room {} "
                        + "without being a participant", email, userId, interactionId);
                client.sendEvent("error", "Forbidden: Not a session participant.");
                return;
            }

            client.joinRoom(interactionId);
            log.info("Client {} (user {}) joined session room {}", client.getSessionId(), email, interactionId);
        });

        // Note: session-event relaying is handled server-side by SocketIOEventService.
        // Backend services broadcast directly to rooms after REST API calls
        // (recommend, verify, extend), so no client→server relay listener is needed.

        return server;
    }

    /**
     * Verifies the connecting client's JWT (cookie first, query param fallback) and
     * returns the verified identity as client store params so event listeners can
     * enforce per-session authorization. Mirrors the checks in JwtAuthenticationFilter:
     * signature + expiry + tokenVersion + account active.
     */
    private AuthorizationResult authorizePaymentSocket(HandshakeData data) {
        String token = extractAccessToken(data);
        if (token == null || !isValidIdentity(token)) {
            log.warn("[SECURITY] Payment socket: rejected unauthenticated connection from {}",
                    data.getAddress());
            return AuthorizationResult.FAILED_AUTHORIZATION;
        }

        Map<String, Object> storeParams = new HashMap<>();
        storeParams.put("email", jwtService.extractEmail(token));
        storeParams.put("userId", jwtService.extractUserId(token));
        storeParams.put("role", jwtService.extractRole(token));
        return new AuthorizationResult(true, storeParams);
    }

    /**
     * Signature + expiry check via JwtService, plus server-side invalidation
     * (tokenVersion) and account-active checks against the user record.
     */
    private boolean isValidIdentity(String token) {
        if (!jwtService.validateToken(token)) {
            return false;
        }
        String email = jwtService.extractEmail(token);
        Long tokenVersion = jwtService.extractTokenVersion(token);
        if (email != null && tokenVersion != null) {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                Long currentVersion = user.getTokenVersion();
                if (currentVersion != null && !currentVersion.equals(tokenVersion)) {
                    log.warn("Payment socket: token version mismatch for {} (token={}, current={})",
                            email, tokenVersion, currentVersion);
                    return false;
                }
                if (!Boolean.TRUE.equals(user.getIsActive())) {
                    log.warn("Payment socket: account deactivated for {}", email);
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Reads the accessToken httpOnly cookie from the handshake; falls back to a
     * `token` query parameter (used by tooling/tests, mirrors signaling server).
     */
    private String extractAccessToken(HandshakeData data) {
        String cookieHeader = data.getHttpHeaders().get("Cookie");
        if (cookieHeader != null) {
            for (String part : cookieHeader.split(";")) {
                String trimmed = part.trim();
                if (trimmed.startsWith("accessToken=")) {
                    return trimmed.substring("accessToken=".length());
                }
            }
        }
        return data.getSingleUrlParam("token");
    }
}
