package com.flyhigh.backend.seed;

import com.flyhigh.backend.model.*;
import com.flyhigh.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Idempotent development data seeder that fills gaps to reach target counts.
 *
 * On each run:
 *  1. Counts existing seeded records (isSeedData=true) by type.
 *  2. Creates only the missing records to reach the target count.
 *  3. Never touches or deletes real (non-seed) user data.
 *
 * Targets: 200 CLIENTS, 100 EXPERTS (each with ExpertProfile), ~500 reviews.
 */
@Component
public class DevDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private static final String SEED_SOURCE = "DEV_SEED";
    private static final int TARGET_CLIENTS = 200;
    private static final int TARGET_EXPERTS = 100;
    private static final int TARGET_REVIEWS = 500;

    private final UserRepository userRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final InteractionRepository interactionRepository;
    private final DropdownDefinitionRepository dropdownDefinitionRepository;
    private final CallRequestRepository callRequestRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    private final Random rng = ThreadLocalRandom.current();

    // --- Realistic static data arrays ---

    private static final String[] FIRST_NAMES = {
            "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
            "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
            "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
            "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
            "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
            "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Dorothy", "George", "Melissa",
            "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
            "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
            "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
            "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
            "Benjamin", "Samantha", "Samuel", "Katherine", "Raymond", "Christine", "Gregory", "Debra",
            "Frank", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack", "Catherine",
            "Dennis", "Maria", "Jerry", "Heather", "Tyler", "Diane"
    };

    private static final String[] LAST_NAMES = {
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
            "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
            "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
            "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
            "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
            "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
            "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
            "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales",
            "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson",
            "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward",
            "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray",
            "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel",
            "Myers", "Long", "Ross", "Foster"
    };

    private static final String[] COUNTRIES = {
            "United States", "United Kingdom", "Canada", "Australia", "Germany",
            "France", "India", "Brazil", "Japan", "South Korea", "Singapore",
            "Netherlands", "Switzerland", "Sweden", "Spain", "Italy", "Mexico",
            "Argentina", "South Africa", "Nigeria", "Kenya", "United Arab Emirates",
            "New Zealand", "Ireland", "Denmark", "Norway"
    };

    private static final String[] LANGUAGES_ARRAY = {
            "English", "Spanish", "French", "German", "Mandarin", "Arabic", "Hindi",
            "Portuguese", "Japanese", "Korean", "Russian", "Italian", "Dutch",
            "Turkish", "Vietnamese", "Thai"
    };

    private static final String[][] CATEGORIES = {
            {"Technology & IT", "Software Development"},
            {"Technology & IT", "Cloud & DevOps"},
            {"Technology & IT", "Data Science & AI"},
            {"Technology & IT", "Cybersecurity"},
            {"Technology & IT", "Product Management"},
            {"Business & Finance", "Financial Planning"},
            {"Business & Finance", "Accounting & Tax"},
            {"Business & Finance", "Investment Strategy"},
            {"Business & Finance", "Startup Advisory"},
            {"Business & Finance", "Operations"},
            {"Health & Wellness", "Nutrition"},
            {"Health & Wellness", "Mental Wellness"},
            {"Health & Wellness", "Fitness Coaching"},
            {"Health & Wellness", "Preventive Care"},
            {"Health & Wellness", "Life Coaching"},
            {"Education & Career", "Career Guidance"},
            {"Education & Career", "Resume Review"},
            {"Education & Career", "Interview Preparation"},
            {"Education & Career", "Study Abroad"},
            {"Education & Career", "Skill Development"},
            {"Legal & Compliance", "Corporate Law"},
            {"Legal & Compliance", "Contract Review"},
            {"Legal & Compliance", "Intellectual Property"},
            {"Legal & Compliance", "Regulatory Compliance"},
            {"Legal & Compliance", "Immigration"},
            {"Marketing & Sales", "Digital Marketing"},
            {"Marketing & Sales", "SEO & Content"},
            {"Marketing & Sales", "Brand Strategy"},
            {"Marketing & Sales", "Sales Coaching"},
            {"Marketing & Sales", "Market Research"},
            {"Creative & Design", "UI/UX Design"},
            {"Creative & Design", "Graphic Design"},
            {"Creative & Design", "Video Editing"},
            {"Creative & Design", "Copywriting"},
            {"Creative & Design", "Interior Design"},
            {"Engineering & Manufacturing", "Mechanical Engineering"},
            {"Engineering & Manufacturing", "Electrical Engineering"},
            {"Engineering & Manufacturing", "Civil Engineering"},
            {"Engineering & Manufacturing", "Supply Chain"},
            {"Engineering & Manufacturing", "Quality Assurance"}
    };

    private static final String[] PROFESSIONAL_TITLES = {
            "Senior Consultant", "Lead Specialist", "Principal Advisor", "Expert Coach",
            "Strategic Consultant", "Senior Strategist", "Lead Engineer", "Principal Designer",
            "Chief Advisor", "Master Coach", "Senior Partner", "Executive Consultant",
            "Lead Mentor", "Principal Analyst", "Senior Expert", "Head of Advisory",
            "Senior Practitioner", "Lead Architect", "Principal Consultant", "Expert Strategist"
    };

    private static final String[] REVIEW_TEXTS = {
            "Absolutely brilliant session! Exceeded my expectations in every way.",
            "Very knowledgeable and patient. Would highly recommend.",
            "Great insights and practical advice. Worth every minute.",
            "Helped me solve a complex problem in just one session. Amazing!",
            "Professional, responsive, and incredibly helpful.",
            "One of the best consultants I've ever worked with.",
            "Clear communicator with deep expertise in the subject.",
            "Provided actionable steps that I could implement immediately.",
            "Very thorough and detail-oriented. Excellent experience.",
            "Fantastic session. I learned more in 30 minutes than in weeks of research.",
            "Good session overall. Some room for improvement on pacing.",
            "Solid advice and practical frameworks. Will book again.",
            "Incredible depth of knowledge. Highly specialized expert.",
            "Patient and understanding. Made complex topics easy to grasp.",
            "Exceptional quality of service. Truly world-class expertise."
    };

    // In-memory cache of all seed IDs for review linking
    private final List<String> seedClientIds = new ArrayList<>();
    private final List<String> seedExpertIds = new ArrayList<>();
    private final Map<String, ExpertProfile> seedExpertProfiles = new HashMap<>();

    public DevDataSeeder(UserRepository userRepository,
                         ExpertProfileRepository expertProfileRepository,
                         InteractionRepository interactionRepository,
                         DropdownDefinitionRepository dropdownDefinitionRepository,
                         CallRequestRepository callRequestRepository,
                         BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.interactionRepository = interactionRepository;
        this.dropdownDefinitionRepository = dropdownDefinitionRepository;
        this.callRequestRepository = callRequestRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Main entry point.
     * Counts existing seed data, computes gaps, and fills only what's missing.
     * Idempotent — safe to run any number of times.
     */
    public void seedAll() {
        log.info("=== DEV DATA SEEDER STARTING ===");

        // 1. Load all existing seed data into memory for review linking
        loadExistingSeedDataIntoCache();

        // 2. Count existing seed records
        long existingClients = userRepository.countByIsSeedDataTrueAndRole("CLIENT");
        long existingExperts = userRepository.countByIsSeedDataTrueAndRole("EXPERT");
        long existingReviews = callRequestRepository.countByIsSeedDataTrue();

        log.info("Current seed counts: {} clients, {} experts, {} reviews",
                existingClients, existingExperts, existingReviews);

        // 3. Compute gaps
        int clientsNeeded = Math.max(0, TARGET_CLIENTS - (int) existingClients);
        int expertsNeeded = Math.max(0, TARGET_EXPERTS - (int) existingExperts);
        int reviewsNeeded = Math.max(0, TARGET_REVIEWS - (int) existingReviews);

        // 4. Ensure dropdown definitions are marked
        markDropdownDefinitions();

        // 5. Fill gaps
        if (clientsNeeded > 0) {
            log.info("Gap: {} more clients needed (have {}, target {}).",
                    clientsNeeded, existingClients, TARGET_CLIENTS);
            seedClients(clientsNeeded);
        } else {
            log.info("Clients: target reached ({}). No new clients needed.", existingClients);
        }

        if (expertsNeeded > 0) {
            log.info("Gap: {} more experts needed (have {}, target {}).",
                    expertsNeeded, existingExperts, TARGET_EXPERTS);
            seedExperts(expertsNeeded);
        } else {
            log.info("Experts: target reached ({}). No new experts needed.", existingExperts);
        }

        // 6. Ensure every seeded expert has an ExpertProfile
        ensureExpertProfiles();

        // 7. Fill review gaps
        if (reviewsNeeded > 0 && !seedClientIds.isEmpty() && !seedExpertIds.isEmpty()) {
            log.info("Gap: {} more reviews needed (have {}, target {}).",
                    reviewsNeeded, existingReviews, TARGET_REVIEWS);
            seedReviews(reviewsNeeded);
        } else if (seedClientIds.isEmpty() || seedExpertIds.isEmpty()) {
            log.info("Reviews: no seed clients/experts available — skipping.");
        } else {
            log.info("Reviews: target reached ({}). No new reviews needed.", existingReviews);
        }

        // Final summary
        long finalClients = userRepository.countByIsSeedDataTrueAndRole("CLIENT");
        long finalExperts = userRepository.countByIsSeedDataTrueAndRole("EXPERT");
        long finalReviews = callRequestRepository.countByIsSeedDataTrue();

        log.info("=== DEV DATA SEEDER COMPLETE ===");
        log.info("Final counts: {} clients, {} experts, {} reviews",
                finalClients, finalExperts, finalReviews);
    }

    /**
     * Loads IDs from previously seeded data into in-memory caches.
     * This ensures review generation can link to existing seed users.
     */
    private void loadExistingSeedDataIntoCache() {
        // Clients
        List<User> existingClients = userRepository.findByIsSeedDataTrueAndRole("CLIENT");
        for (User u : existingClients) {
            if (!seedClientIds.contains(u.getId())) {
                seedClientIds.add(u.getId());
            }
        }
        log.debug("Loaded {} existing seed clients into cache.", seedClientIds.size());

        // Experts
        List<User> existingExperts = userRepository.findByIsSeedDataTrueAndRole("EXPERT");
        for (User u : existingExperts) {
            if (!seedExpertIds.contains(u.getId())) {
                seedExpertIds.add(u.getId());
            }
        }
        log.debug("Loaded {} existing seed experts into cache.", seedExpertIds.size());

        // ExpertProfiles
        List<ExpertProfile> existingProfiles = expertProfileRepository.findByIsSeedDataTrue();
        for (ExpertProfile p : existingProfiles) {
            seedExpertProfiles.putIfAbsent(p.getUserId(), p);
        }
        log.debug("Loaded {} existing seed expert profiles into cache.", seedExpertProfiles.size());
    }

    /**
     * Marks existing dropdown definitions with seed flags so they persist
     * in the dev database but are identifiable as seed-created.
     */
    private void markDropdownDefinitions() {
        List<DropdownDefinition> all = dropdownDefinitionRepository.findAll();
        int marked = 0;
        for (DropdownDefinition def : all) {
            if (!Boolean.TRUE.equals(def.getIsSeedData())) {
                def.setIsSeedData(true);
                def.setSeedSource(SEED_SOURCE);
                dropdownDefinitionRepository.save(def);
                marked++;
            }
        }
        if (marked > 0) {
            log.info("Marked {} dropdown definitions as seed data.", marked);
        }
    }

    /**
     * Creates exactly {@code count} new seed clients.
     * Skips any email that already exists in the database (seed or real).
     */
    private void seedClients(int count) {
        Instant now = Instant.now();
        int created = 0;
        int attempts = 0;
        int maxAttempts = count * 3; // safety valve against email collisions

        while (created < count && attempts < maxAttempts) {
            attempts++;
            String firstName = FIRST_NAMES[rng.nextInt(FIRST_NAMES.length)];
            String lastName = LAST_NAMES[rng.nextInt(LAST_NAMES.length)];
            String email = generateEmail(firstName, lastName, created, "client");

            if (userRepository.findByEmail(email).isPresent()) {
                continue; // skip duplicates (seed or real)
            }

            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode("password123"));
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setFullName(firstName + " " + lastName);
            user.setCountry(COUNTRIES[rng.nextInt(COUNTRIES.length)]);
            user.setRole("CLIENT");
            user.setProfileCompleted(true);
            user.setIsActive(true);
            user.setAuthProvider("local");
            user.setEmailVerified(true);
            user.setIsSeedData(true);
            user.setSeedSource(SEED_SOURCE);
            user.setCreatedAt(now.minus(rng.nextInt(180), ChronoUnit.DAYS));
            user.setUpdatedAt(user.getCreatedAt());

            User saved = userRepository.save(user);
            seedClientIds.add(saved.getId());
            created++;
        }

        log.info("Created {} new seed clients (attempted {}).", created, attempts);
    }

    /**
     * Creates exactly {@code count} new seed experts (User documents only).
     * ExpertProfiles are created separately by {@link #ensureExpertProfiles()}.
     */
    private void seedExperts(int count) {
        Instant now = Instant.now();
        int created = 0;
        int attempts = 0;
        int maxAttempts = count * 3;

        while (created < count && attempts < maxAttempts) {
            attempts++;
            String firstName = FIRST_NAMES[rng.nextInt(FIRST_NAMES.length)];
            String lastName = LAST_NAMES[rng.nextInt(LAST_NAMES.length)];
            String email = generateEmail(firstName, lastName, created, "expert");

            if (userRepository.findByEmail(email).isPresent()) {
                continue;
            }

            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode("password123"));
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setFullName(firstName + " " + lastName);
            user.setCountry(COUNTRIES[rng.nextInt(COUNTRIES.length)]);
            user.setRole("EXPERT");
            user.setProfileCompleted(true);
            user.setIsActive(true);
            user.setAuthProvider("local");
            user.setEmailVerified(true);
            user.setIsSeedData(true);
            user.setSeedSource(SEED_SOURCE);

            Instant created_ = now.minus(rng.nextInt(365), ChronoUnit.DAYS);
            user.setCreatedAt(created_);
            user.setUpdatedAt(created_);

            User saved = userRepository.save(user);
            seedExpertIds.add(saved.getId());
            created++;
        }

        log.info("Created {} new seed experts (attempted {}).", created, attempts);
    }

    /**
     * Ensures every seeded expert in the cache has an ExpertProfile.
     * Creates missing profiles without touching existing ones.
     */
    private void ensureExpertProfiles() {
        Instant now = Instant.now();
        int profilesCreated = 0;

        for (String expertId : seedExpertIds) {
            if (seedExpertProfiles.containsKey(expertId)) {
                continue; // profile already exists
            }

            User expert = userRepository.findById(expertId).orElse(null);
            if (expert == null) continue;

            String[] cat = CATEGORIES[rng.nextInt(CATEGORIES.length)];
            String category = cat[0];
            String subCategory = cat[1];
            String country = expert.getCountry() != null
                    ? expert.getCountry()
                    : COUNTRIES[rng.nextInt(COUNTRIES.length)];

            ExpertProfile profile = new ExpertProfile();
            profile.setUserId(expertId);
            profile.setProfessionalTitle(PROFESSIONAL_TITLES[rng.nextInt(PROFESSIONAL_TITLES.length)]);
            profile.setCategory(category);
            profile.setSubCategory(subCategory);
            profile.setCountry(country);
            profile.setYearsOfExperience(3 + rng.nextInt(28));
            profile.setBio(generateBio(expert.getFirstName(), category, subCategory));
            profile.setHourlyRate(25.0 + (rng.nextInt(38) * 5.0));
            profile.setPhoneNumber("+1" + (2000000000L + rng.nextInt(800000000)));

            // Languages
            Set<String> langs = new HashSet<>();
            langs.add("English");
            int extraLangs = rng.nextInt(4);
            while (langs.size() < 1 + extraLangs) {
                langs.add(LANGUAGES_ARRAY[rng.nextInt(LANGUAGES_ARRAY.length)]);
            }
            profile.setLanguages(String.join(", ", langs));

            // Online status: ~20% online, ~30% busy, ~50% offline
            double roll = rng.nextDouble();
            if (roll < 0.20) {
                profile.setIsOnline(true);
                profile.setLastActivityAt(now);
            } else if (roll < 0.50) {
                profile.setIsOnline(true);
                profile.setLastActivityAt(now.minus(rng.nextInt(12), ChronoUnit.HOURS));
            } else {
                profile.setIsOnline(false);
                profile.setLastActivityAt(now.minus(1 + rng.nextInt(30), ChronoUnit.DAYS));
            }

            profile.setIsApproved(true);
            profile.setIsSeedData(true);
            profile.setSeedSource(SEED_SOURCE);
            profile.setCreatedAt(expert.getCreatedAt());
            profile.setUpdatedAt(expert.getCreatedAt());

            ExpertProfile savedProfile = expertProfileRepository.save(profile);
            seedExpertProfiles.put(expertId, savedProfile);
            profilesCreated++;
        }

        if (profilesCreated > 0) {
            log.info("Created {} missing ExpertProfiles for seed experts.", profilesCreated);
        } else {
            log.info("All seed experts already have profiles.");
        }
    }

    /**
     * Creates exactly {@code count} new seed reviews (CallRequest documents with
     * status=COMPLETED).  Picks random client-expert pairs from the seed cache,
     * avoiding duplicates with the same clientId+expertId combination.
     */
    private void seedReviews(int count) {
        Instant now = Instant.now();
        int created = 0;
        int attempts = 0;
        int maxAttempts = count * 5; // generous limit for random pair collisions

        // Track which pairs already have a seed review to avoid duplicates
        Set<String> existingPairs = loadExistingReviewPairs();

        while (created < count && attempts < maxAttempts) {
            attempts++;

            String clientId = seedClientIds.get(rng.nextInt(seedClientIds.size()));
            String expertId = seedExpertIds.get(rng.nextInt(seedExpertIds.size()));
            String pairKey = clientId + "::" + expertId;

            if (existingPairs.contains(pairKey)) {
                continue; // already reviewed
            }
            existingPairs.add(pairKey);

            User client = userRepository.findById(clientId).orElse(null);
            if (client == null) continue;

            CallRequest review = new CallRequest();
            review.setClientId(clientId);
            review.setExpertId(expertId);
            review.setClientName(client.getFullName());
            review.setClientEmail(client.getEmail());
            review.setRoomId(UUID.randomUUID().toString().substring(0, 12));
            review.setStatus("COMPLETED");
            review.setRating(3 + rng.nextInt(3)); // 3–5

            int rating = review.getRating();
            String reviewText;
            if (rating == 5) {
                reviewText = REVIEW_TEXTS[rng.nextInt(10)];
            } else if (rating == 4) {
                reviewText = REVIEW_TEXTS[5 + rng.nextInt(6)];
            } else {
                reviewText = REVIEW_TEXTS[10 + rng.nextInt(5)];
            }
            review.setReview(reviewText);
            review.setCreatedAt(now.minus(rng.nextInt(90), ChronoUnit.DAYS));
            review.setRespondedAt(review.getCreatedAt().plus(rng.nextInt(60), ChronoUnit.MINUTES));
            review.setIsSeedData(true);
            review.setSeedSource(SEED_SOURCE);

            callRequestRepository.save(review);
            created++;
        }

        log.info("Created {} new seed reviews (attempted {}).", created, attempts);
    }

    /**
     * Loads existing clientId+expertId pairs from seed CallRequests
     * to prevent duplicate review generation.
     */
    private Set<String> loadExistingReviewPairs() {
        Set<String> pairs = new HashSet<>();
        // We don't have a dedicated query for all seed CallRequests,
        // but we can iterate the seed experts' reviews via the repository
        for (String expertId : seedExpertIds) {
            List<CallRequest> existing = callRequestRepository.findByExpertIdOrderByCreatedAtDesc(expertId);
            for (CallRequest cr : existing) {
                if (Boolean.TRUE.equals(cr.getIsSeedData())
                        || SEED_SOURCE.equals(cr.getSeedSource())) {
                    pairs.add(cr.getClientId() + "::" + cr.getExpertId());
                }
            }
        }
        log.debug("Loaded {} existing seed review pairs.", pairs.size());
        return pairs;
    }

    // --- Helper Methods ---

    private String generateEmail(String firstName, String lastName, int index, String role) {
        String cleanFirst = firstName.toLowerCase().replaceAll("[^a-z]", "");
        String cleanLast = lastName.toLowerCase().replaceAll("[^a-z]", "");
        return String.format("seed.%s.%s%d@flyhigh.dev", cleanFirst, cleanLast, index);
    }

    private String generateBio(String firstName, String category, String subCategory) {
        String[] bios = {
                String.format("%s is a seasoned %s specialist with deep expertise in %s. "
                        + "Passionate about delivering results-driven consulting that transforms businesses "
                        + "and empowers individuals to reach their full potential.", firstName, category, subCategory),
                String.format("With extensive experience in %s, %s brings a unique blend of technical "
                        + "excellence and strategic thinking to every engagement. Specializing in %s, "
                        + "they help clients navigate complex challenges with confidence.", category, firstName, subCategory),
                String.format("%s has spent years mastering %s, with a particular focus on %s. "
                        + "Known for a practical, hands-on approach that delivers measurable outcomes "
                        + "and lasting impact for every client.", firstName, category, subCategory),
                String.format("As a dedicated professional in %s, %s combines industry best practices "
                        + "with innovative thinking in %s. Their client-first philosophy ensures every "
                        + "session is productive, insightful, and actionable.", category, firstName, subCategory),
                String.format("%s is passionate about %s and specializes in %s. "
                        + "They believe in continuous learning and bring the latest industry insights "
                        + "to every consultation, ensuring clients stay ahead of the curve.", firstName, category, subCategory),
        };
        return bios[rng.nextInt(bios.length)];
    }
}