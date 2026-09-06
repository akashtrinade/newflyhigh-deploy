package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Dispute;
import com.flyhigh.backend.model.DisputeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisputeRepository extends MongoRepository<Dispute, String> {

    List<Dispute> findByInteractionId(String interactionId);

    List<Dispute> findByClientIdOrderByCreatedAtDesc(String clientId);

    List<Dispute> findByExpertIdOrderByCreatedAtDesc(String expertId);

    List<Dispute> findByEarningId(String earningId);

    Page<Dispute> findByStatusOrderByCreatedAtAsc(DisputeStatus status, Pageable pageable);

    Page<Dispute> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(DisputeStatus status);

    long countByStatusNot(DisputeStatus status);
}
