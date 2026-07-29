package com.flyhigh.backend.config;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    private static final Logger log = LoggerFactory.getLogger(SocketIOConfig.class);

    @Value("${socketio.payment.port:8085}")
    private int port;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setPort(port);
        config.setOrigin("*");
        config.setHostname("0.0.0.0");
        config.setMaxFramePayloadLength(1024 * 1024);
        config.setMaxHttpContentLength(1024 * 1024);

        SocketIOServer server = new SocketIOServer(config);

        server.addConnectListener(client -> {
            log.info("Payment socket client connected: {}", client.getSessionId());
        });

        server.addDisconnectListener(client -> {
            log.info("Payment socket client disconnected: {}", client.getSessionId());
        });

        server.addEventListener("join-session", String.class, (client, interactionId, ackRequest) -> {
            client.joinRoom(interactionId);
            log.info("Client {} joined session room {}", client.getSessionId(), interactionId);
        });

        // Note: session-event relaying is handled server-side by SocketIOEventService.
        // Backend services broadcast directly to rooms after REST API calls
        // (recommend, verify, extend), so no client→server relay listener is needed.

        return server;
    }
}
