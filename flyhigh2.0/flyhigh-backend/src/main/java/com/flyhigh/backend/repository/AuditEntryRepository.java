package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.AuditEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditEntryRepository extends MongoRepository<AuditEntry, String> {

    List<AuditEntry> findByCorrelationIdOrderByTimestampAsc(String correlationId);

    List<AuditEntry> findByEventTypeAndEntityIdOrderByTimestampAsc(String eventType, String entityId);

    List<AuditEntry> findByEntityIdOrderByTimestampAsc(String entityId);
}
