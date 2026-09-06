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

    /** Count approved expert profiles for public stats. */
    long countByIsApprovedTrue();

    /** Find approved experts currently online — used for featured section. */
    List<ExpertProfile> findByIsApprovedTrueAndIsOnlineTrue();

    /** Find all approved expert profiles — used for category grouping. */
    List<ExpertProfile> findByIsApprovedTrue();

    /** Find the profile awaiting a RazorpayX bank-validation result. */
    Optional<ExpertProfile> findByPayoutValidationId(String validationId);
}
