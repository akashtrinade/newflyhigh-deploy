package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Payout;
import com.flyhigh.backend.model.PayoutStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayoutRepository extends MongoRepository<Payout, String> {
    List<Payout> findByExpertIdOrderByCreatedAtDesc(String expertId);
    List<Payout> findByEarningIdsContains(String earningId);
    Optional<Payout> findByIdempotencyKey(String idempotencyKey);
    Optional<Payout> findByGatewayPayoutId(String gatewayPayoutId);
    List<Payout> findByStatusAndGatewayPayoutIdNotNullAndCreatedAtBefore(PayoutStatus status, Instant before);
}
