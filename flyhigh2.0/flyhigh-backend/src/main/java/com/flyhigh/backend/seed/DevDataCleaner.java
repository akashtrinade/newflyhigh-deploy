package com.flyhigh.backend.seed;

import com.flyhigh.backend.model.DropdownDefinition;
import com.flyhigh.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Deletes ONLY documents where isSeedData=true or seedSource="DEV_SEED".
 * Never touches real user data.
 *
 * Deletion order respects foreign-key-like references:
 *  1. CallRequest (reviews/ratings) — references users
 *  2. Interaction — references users
 *  3. ExpertProfile — references users
 *  4. User — root entity
 *  5. DropdownDefinition — independent
 */
@Component
public class DevDataCleaner {

    private static final Logger log = LoggerFactory.getLogger(DevDataCleaner.class);
    private static final String SEED_SOURCE = "DEV_SEED";

    private final CallRequestRepository callRequestRepository;
    private final InteractionRepository interactionRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final UserRepository userRepository;
    private final DropdownDefinitionRepository dropdownDefinitionRepository;

    public DevDataCleaner(CallRequestRepository callRequestRepository,
                          InteractionRepository interactionRepository,
                          ExpertProfileRepository expertProfileRepository,
                          UserRepository userRepository,
                          DropdownDefinitionRepository dropdownDefinitionRepository) {
        this.callRequestRepository = callRequestRepository;
        this.interactionRepository = interactionRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.userRepository = userRepository;
        this.dropdownDefinitionRepository = dropdownDefinitionRepository;
    }

    /**
     * Deletes all seed data across all collections.
     * Idempotent — safe to call multiple times.
     */
    public void cleanAll() {
        log.info("=== DEV DATA CLEANER STARTING ===");
        log.warn("This will delete ALL seed data (isSeedData=true or seedSource='{}').", SEED_SOURCE);
        log.warn("REAL USER DATA WILL NOT BE AFFECTED.");

        long before = totalSeedCount();

        // 1. CallRequest (reviews/ratings)
        callRequestRepository.deleteByIsSeedDataTrueOrSeedSource(SEED_SOURCE);
        log.info("Cleaned CallRequests.");

        // 2. Interactions
        interactionRepository.deleteByIsSeedDataTrueOrSeedSource(SEED_SOURCE);
        log.info("Cleaned Interactions.");

        // 3. ExpertProfiles
        expertProfileRepository.deleteByIsSeedDataTrueOrSeedSource(SEED_SOURCE);
        log.info("Cleaned ExpertProfiles.");

        // 4. Users
        userRepository.deleteByIsSeedDataTrueOrSeedSource(SEED_SOURCE);
        log.info("Cleaned Users.");

        // 5. DropdownDefinitions (unmark seed flag; keep the definitions)
        List<DropdownDefinition> dropdowns = dropdownDefinitionRepository.findByIsSeedDataTrue();
        for (DropdownDefinition dd : dropdowns) {
            dd.setIsSeedData(null);
            dd.setSeedSource(null);
            dropdownDefinitionRepository.save(dd);
        }
        log.info("Removed seed flags from {} DropdownDefinitions.", dropdowns.size());

        long after = totalSeedCount();
        log.info("=== DEV DATA CLEANER COMPLETE ===");
        log.info("Deleted {} seed documents.", before - after);
    }

    /**
     * Counts total seed documents across all collections.
     */
    private long totalSeedCount() {
        long users = userRepository.countByIsSeedDataTrue();
        long profiles = expertProfileRepository.findByIsSeedDataTrue().size();
        long calls = callRequestRepository.countByIsSeedDataTrue();
        long interactions = interactionRepository.countByIsSeedDataTrue();
        return users + profiles + calls + interactions;
    }
}