package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * User notification stored by the signaling server.
 * Read-only from the backend perspective — the signaling server writes these.
 */
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    @Indexed
    private String userId;       // Target user's MongoDB ID

    private String userEmail;    // Target user's email
    private String expertEmail;  // Related expert email
    private String type;         // "chat" | "video-call"
    private String message;      // Notification text
    private String roomName;     // Related room/call
    private Boolean read;        // Whether the user has read it
    private Instant timestamp;   // When the notification was created

    public Notification() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getExpertEmail() { return expertEmail; }
    public void setExpertEmail(String expertEmail) { this.expertEmail = expertEmail; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public Boolean getRead() { return read; }
    public void setRead(Boolean read) { this.read = read; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
