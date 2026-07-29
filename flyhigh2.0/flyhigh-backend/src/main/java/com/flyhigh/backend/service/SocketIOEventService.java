package com.flyhigh.backend.service;

import com.corundumstudio.socketio.SocketIOServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for broadcasting session events via Socket.IO to room participants.
 */
@Service
public class SocketIOEventService {

    private static final Logger log = LoggerFactory.getLogger(SocketIOEventService.class);

    private final SocketIOServer socketIOServer;

    public SocketIOEventService(SocketIOServer socketIOServer) {
        this.socketIOServer = socketIOServer;
    }

    /**
     * Broadcasts a session event to all clients in the session room.
     *
     * @param interactionId The session room identifier
     * @param eventType     Type of event (recommendation, payment-completed, session-extended, timer-expired)
     * @param payload       Optional additional data
     */
    public void broadcastSessionEvent(String interactionId, String eventType, Map<String, Object> payload) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("interactionId", interactionId);
            if (payload != null) {
                event.putAll(payload);
            }

            // Broadcast to the interaction room (both client and expert)
            socketIOServer.getRoomOperations(interactionId)
                    .sendEvent("session-event", event);

            log.debug("Broadcast session event: type={} room={}", eventType, interactionId);
        } catch (Exception e) {
            log.error("Failed to broadcast session event: type={} room={} error={}",
                    eventType, interactionId, e.getMessage());
        }
    }
}
