package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Payout;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayoutRepository extends MongoRepository<Payout, String> {
    List<Payout> findByExpertId(String expertId);
}
