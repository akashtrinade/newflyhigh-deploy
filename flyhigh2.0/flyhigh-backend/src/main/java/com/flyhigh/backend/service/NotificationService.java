package com.flyhigh.backend.service;

import com.flyhigh.backend.model.Notification;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.NotificationRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Writes Notification documents for in-app notification delivery.
 *
 * Historically the Notification model claimed the signaling server wrote these,
 * but the signaling server has no MongoDB access — notifications were never
 * created and the notifications page stayed empty. The backend now writes
 * notifications for key lifecycle events (call requests, responses, payments).
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /**
     * Creates a notification for the given user (by MongoDB user ID).
     * Non-fatal — notification failures never break the underlying flow.
     */
    public void createForUser(String userId, String type, String message,
                              String roomName, String expertEmail) {
        try {
            if (userId == null) return;
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;

            Notification n = new Notification();
            n.setUserId(userId);
            n.setUserEmail(user.getEmail());
            n.setExpertEmail(expertEmail);
            n.setType(type);
            n.setMessage(message);
            n.setRoomName(roomName);
            n.setRead(false);
            n.setTimestamp(Instant.now());
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Failed to create notification for {}: {}", userId, e.getMessage());
        }
    }
}
