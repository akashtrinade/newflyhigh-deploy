package com.flyhigh.backend.service;

import com.flyhigh.backend.model.AuditEntry;
import com.flyhigh.backend.repository.AuditEntryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Non-blocking audit trail service.
 *
 * Every record() call is dispatched on a separate thread via {@code @Async}.
 * If the audit write fails (e.g. MongoDB transient error), the exception is
 * logged and swallowed — the main business transaction is NEVER affected.
 */
@Service
@Slf4j
public class AuditService {

    private final AuditEntryRepository auditRepo;

    public AuditService(AuditEntryRepository auditRepo) {
        this.auditRepo = auditRepo;
    }

    /**
     * Persist an immutable audit entry asynchronously.
     *
     * @param eventType     ORDER_CREATED | PAYMENT_VERIFIED | PAYMENT_FAILED |
     *                      SESSION_EXTENDED | SESSION_COMPLETED | EARNING_PROCESSED
     * @param entityType    "INTERACTION" | "SESSION_PAYMENT" | "EXPERT_EARNING"
     * @param entityId      MongoDB ID of the affected entity
     * @param actorId       user ID or "SYSTEM"
     * @param amount        financial amount in INR (nullable)
     * @param correlationId links related entries across a single transaction flow
     * @param metadata      extensible key-value bag for event-specific data
     */
    @Async
    public void record(String eventType, String entityType, String entityId,
                       String actorId, Double amount, String correlationId,
                       Map<String, String> metadata) {
        try {
            AuditEntry entry = AuditEntry.builder()
                    .eventType(eventType)
                    .entityType(entityType)
                    .entityId(entityId)
                    .actorId(actorId)
                    .amount(amount)
                    .currency("INR")
                    .metadata(metadata)
                    .timestamp(Instant.now())
                    .correlationId(correlationId)
                    .build();
            auditRepo.save(entry);
        } catch (Exception e) {
            log.error("Audit logging failed (non-fatal): {}", e.getMessage());
        }
    }
}
