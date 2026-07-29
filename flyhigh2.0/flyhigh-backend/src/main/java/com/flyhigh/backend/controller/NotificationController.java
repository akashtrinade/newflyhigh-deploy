package com.flyhigh.backend.controller;

import com.flyhigh.backend.model.Notification;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.NotificationRepository;
import com.flyhigh.backend.service.AuthService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Notification Controller — read-only access to notifications
 * written by the signaling server to MongoDB.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final AuthService authService;

    public NotificationController(NotificationRepository notificationRepository,
                                   AuthService authService) {
        this.notificationRepository = notificationRepository;
        this.authService = authService;
    }

    /**
     * Get paginated notifications for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<?> getNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not authenticated"));
        }

        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "User not found"));
        }

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<Notification> notifications = notificationRepository.findByUserIdOrderByTimestampDesc(user.getId(), pageable);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", notifications.getContent(),
                "totalElements", notifications.getTotalElements(),
                "totalPages", notifications.getTotalPages(),
                "page", page,
                "size", size
        ));
    }

    /**
     * Get unread notification count for the authenticated user.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not authenticated"));
        }

        User user = authService.getUserByEmail(authentication.getName());
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "User not found"));
        }

        long count = notificationRepository.countByUserIdAndReadIsFalse(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "count", count));
    }
}
