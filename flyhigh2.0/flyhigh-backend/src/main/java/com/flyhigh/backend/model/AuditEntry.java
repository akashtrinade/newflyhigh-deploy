package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

/**
 * Immutable financial audit trail entry for PCI-DSS / SOC 2 compliance.
 * Each record captures a state change involving money across the payment lifecycle.
 *
 * Written asynchronously — audit failures never block or fail the main transaction.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_log")
public class AuditEntry {

    @Id
    private String id;

    /**
     * Event category: ORDER_CREATED, PAYMENT_VERIFIED, PAYMENT_FAILED,
     * SESSION_EXTENDED, SESSION_COMPLETED, EARNING_PROCESSED.
     */
    @Indexed
    private String eventType;

    /**
     * The domain aggregate: "INTERACTION", "SESSION_PAYMENT", "EXPERT_EARNING".
     */
    @Indexed
    private String entityType;

    /** MongoDB ObjectId of the affected entity. */
    @Indexed
    private String entityId;

    /** User ID who triggered the action, or "SYSTEM" for automated events. */
    private String actorId;

    /** Financial amount involved (INR), if applicable. */
    private Double amount;

    /** ISO 4217 currency code — always "INR" for this deployment. */
    private String currency;

    /** Extensible key-value bag for event-specific data. */
    private Map<String, String> metadata;

    /** When the event occurred (wall-clock time). */
    @Indexed
    private Instant timestamp;

    /**
     * Links all audit entries that belong to a single transaction flow.
     * Typically the Interaction ID that initiated the chain.
     */
    @Indexed
    private String correlationId;
}
