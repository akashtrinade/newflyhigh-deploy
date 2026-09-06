package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Represents a client dispute against a completed consultation session.
 * When a dispute is opened, the associated ExpertEarning is blocked
 * from settlement and payout until the dispute is resolved.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "disputes")
public class Dispute {

    @Id
    private String id;

    @Indexed
    private String interactionId;       // The session being disputed

    @Indexed
    private String clientId;            // Client who raised the dispute

    @Indexed
    private String expertId;            // Expert being disputed

    @Indexed
    private String earningId;           // Blocked earning

    // ── Dispute details ──
    private String reason;              // From predefined list (see spec §13.1)

    @Builder.Default
    private String clientStatement = "";

    @Builder.Default
    private String expertResponse = "";

    // ── Status & resolution ──
    @Indexed
    @Builder.Default
    private DisputeStatus status = DisputeStatus.OPEN;

    private String adminId;             // Admin who made the decision
    private String decision;            // ACCEPT / REJECT / INFO_REQUESTED / ESCALATE
    private String decisionReason;      // Admin's rationale

    // ── Timestamps ──
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    private Instant resolvedAt;
}
