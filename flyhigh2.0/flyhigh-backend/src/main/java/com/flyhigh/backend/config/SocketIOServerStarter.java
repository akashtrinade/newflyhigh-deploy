package com.flyhigh.backend.config;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Starts the Socket.IO server after the Spring application is fully ready.
 * Handles graceful shutdown.
 */
@Component
public class SocketIOServerStarter {

    private static final Logger log = LoggerFactory.getLogger(SocketIOServerStarter.class);

    private final SocketIOServer socketIOServer;

    public SocketIOServerStarter(SocketIOServer socketIOServer) {
        this.socketIOServer = socketIOServer;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void startServer() {
        socketIOServer.start();
        log.info("Socket.IO payment server started on port {}", socketIOServer.getConfiguration().getPort());
    }

    @PreDestroy
    public void stopServer() {
        socketIOServer.stop();
        log.info("Socket.IO payment server stopped");
    }
}
