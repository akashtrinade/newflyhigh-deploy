package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.ExpertProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpertProfileRepository extends MongoRepository<ExpertProfile, String> {
    Optional<ExpertProfile> findByUserId(String userId);
    boolean existsByUserId(String userId);
    List<ExpertProfile> findByIsSeedDataTrue();
    void deleteByIsSeedDataTrueOrSeedSource(String seedSource);
}
