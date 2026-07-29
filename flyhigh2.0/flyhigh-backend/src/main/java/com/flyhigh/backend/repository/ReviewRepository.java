package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByExpertIdOrderByCreatedAtDesc(String expertId);
    List<Review> findBySessionId(String sessionId);
}
