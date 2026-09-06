package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.ExpertProfileResponse;
import com.flyhigh.backend.dto.ExpertReviewResponse;
import com.flyhigh.backend.dto.ExpertSearchPageResponse;
import com.flyhigh.backend.dto.ExpertSummaryResponse;
import com.flyhigh.backend.model.CallRequest;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.CallRequestRepository;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Handles public expert search, filtering, sorting, and pagination.
 * Queries approved expert profiles and enriches with User data (name).
 */
@Service
public class ExpertSearchService {

    private static final Logger log = LoggerFactory.getLogger(ExpertSearchService.class);

    private final MongoTemplate mongoTemplate;
    private final ExpertProfileRepository expertProfileRepository;
    private final UserRepository userRepository;
    private final InteractionRepository interactionRepository;
    private final CallRequestRepository callRequestRepository;
    private final PricingService pricingService;
    private final AuthService authService;

    /** Online window (seconds) — must match AuthService.computeExpertStatus. */
    @Value("${app.presence.online-window-seconds:120}")
    private long presenceOnlineWindowSeconds;

    public ExpertSearchService(MongoTemplate mongoTemplate,
                               ExpertProfileRepository expertProfileRepository,
                               UserRepository userRepository,
                               InteractionRepository interactionRepository,
                               CallRequestRepository callRequestRepository,
                               PricingService pricingService,
                               AuthService authService) {
        this.mongoTemplate = mongoTemplate;
        this.expertProfileRepository = expertProfileRepository;
        this.userRepository = userRepository;
        this.interactionRepository = interactionRepository;
        this.callRequestRepository = callRequestRepository;
        this.pricingService = pricingService;
        this.authService = authService;
    }

    /**
     * Search, filter, sort, and paginate approved expert profiles.
     */
    public ExpertSearchPageResponse searchExperts(
            String q, String category, String subCategory, String language,
            String country, String availability, String rating, String price,
            String experience, String sort, int page, int size) {

        Query query = new Query();

        // Find valid user IDs first (role=EXPERT, profileCompleted=true)
        Query userQuery = new Query();
        userQuery.addCriteria(Criteria.where("role").is("EXPERT"));
        userQuery.addCriteria(Criteria.where("profileCompleted").is(true));
        userQuery.fields().include("_id");
        List<User> validUsers = mongoTemplate.find(userQuery, User.class);
        List<String> validUserIds = validUsers.stream().map(User::getId).toList();

        if (validUserIds.isEmpty()) {
            return new ExpertSearchPageResponse(List.of(), 0, 0, page, size);
        }

        // Base filter: only experts with valid, completed profiles
        query.addCriteria(Criteria.where("userId").in(validUserIds));

        // Category filter (exact match)
        if (isNotEmpty(category)) {
            query.addCriteria(Criteria.where("category").is(category));
        }

        // SubCategory filter (exact match)
        if (isNotEmpty(subCategory)) {
            query.addCriteria(Criteria.where("subCategory").is(subCategory));
        }

        // Country filter (exact match)
        if (isNotEmpty(country)) {
            query.addCriteria(Criteria.where("country").is(country));
        }

        // Language filter (regex on comma-separated string)
        if (isNotEmpty(language)) {
            query.addCriteria(Criteria.where("languages")
                    .regex(".*" + Pattern.quote(language) + ".*", "i"));
        }

        // Availability filter pushed down to the DB query so pagination sees
        // only matching experts (previously it ran after pagination and only
        // checked the already-loaded page, leaving the Online Experts section
        // empty whenever online experts sat beyond the first page).
        // Mirrors AuthService.computeExpertStatus: ONLINE = isOnline=true with
        // a heartbeat within the online window. Experts with an active session
        // (BUSY) keep heartbeating from the UI every 60s, so they stay included.
        if (isNotEmpty(availability)) {
            boolean filterOnline = "Online".equalsIgnoreCase(availability);
            if (filterOnline) {
                query.addCriteria(Criteria.where("isOnline").is(true));
                query.addCriteria(Criteria.where("lastActivityAt")
                        .gt(Instant.now().minusSeconds(presenceOnlineWindowSeconds)));
            } else {
                query.addCriteria(Criteria.where("isOnline").ne(true));
            }
        }

        // Experience range filter
        addExperienceCriteria(query, experience);

        // Price range filter
        addPriceCriteria(query, price);

        // Rating filter
        addRatingCriteria(query, rating);

        // Apply DB-level sort (pre-sort for consistent pagination)
        applySort(query, sort);

        // Count total matches (without pagination)
        long total = mongoTemplate.count(Query.of(query).limit(0).skip(0), ExpertProfile.class);

        // DB-level pagination — skip/limit before loading into memory
        query.skip((long) page * size).limit(size);
        List<ExpertProfile> profiles = mongoTemplate.find(query, ExpertProfile.class);

        // Batch-load users for the profiles
        List<String> userIds = profiles.stream()
                .map(ExpertProfile::getUserId)
                .distinct()
                .toList();
        Map<String, User> userMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds)
                    .forEach(user -> userMap.put(user.getId(), user));
        }

        // Convert to summaries with user data (includes computed isOnline from heartbeat)
        List<ExpertSummaryResponse> summaries = profiles.stream()
                .map(profile -> toSummary(profile, userMap.get(profile.getUserId())))
                .toList();

        // Post-filter (text search only) applied to the current page —
        // the availability filter is pushed down to the DB query above.
        List<ExpertSummaryResponse> filtered = summaries;
        boolean hasPostFilter = false;

        if (isNotEmpty(q)) {
            String normalizedQuery = q.toLowerCase().trim();
            filtered = filtered.stream()
                    .filter(s -> matchesTextSearch(s, normalizedQuery))
                    .toList();
            hasPostFilter = true;
        }

        // Sort in-memory for post-filtered results (heartbeat-computed isOnline)
        filtered = sortInMemory(filtered, sort, q);

        // When post-filters are active, total is approximate (based on DB count before filtering)
        long effectiveTotal = hasPostFilter ? Math.max(total, filtered.size()) : total;
        int totalPages = effectiveTotal > 0 ? (int) Math.ceil((double) effectiveTotal / size) : 0;

        log.debug("Expert search: {} total (DB), page {}/{} returned {} results (q={}, category={})",
                total, page, totalPages, filtered.size(), q, category);

        return new ExpertSearchPageResponse(filtered, effectiveTotal, totalPages, page, size);
    }

    /**
     * Get a single approved expert's public profile by expert profile ID.
     */
    public ExpertProfileResponse getExpertPublicProfile(String expertId) {
        ExpertProfile profile = expertProfileRepository.findById(expertId).orElse(null);
        if (profile == null) {
            return null;
        }
        User user = userRepository.findById(profile.getUserId()).orElse(null);
        if (user == null || !"EXPERT".equals(user.getRole()) || !Boolean.TRUE.equals(user.getProfileCompleted())) {
            return null;
        }
        return buildPublicResponse(user, profile);
    }

    // --- Private helpers ---

    /**
     * Delegates to AuthService for presence computation (single source of truth).
     */
    private String computeStatusString(ExpertProfile profile) {
        if (profile == null) return "OFFLINE";
        return authService.computeExpertStatus(profile.getUserId());
    }

    /**
     * Delegates to AuthService for online status computation.
     */
    private boolean computeIsOnlineFromProfile(ExpertProfile profile, User user) {
        if (profile == null) return false;
        String status = authService.computeExpertStatus(profile.getUserId());
        return "ONLINE".equals(status) || "BUSY".equals(status);
    }

    private ExpertSummaryResponse toSummary(ExpertProfile profile, User user) {
        ExpertSummaryResponse s = new ExpertSummaryResponse();
        s.setId(profile.getId());
        s.setUserId(profile.getUserId());
        s.setName(user != null ? user.getFullName() : "Unknown");
        s.setProfessionalTitle(profile.getProfessionalTitle());
        s.setCategory(profile.getCategory());
        s.setSubCategory(profile.getSubCategory());
        s.setExperience(profile.getYearsOfExperience());
        s.setLanguages(splitLanguages(profile.getLanguages()));
        s.setCountry(profile.getCountry());
        s.setRating(profile.getAverageRating() != null ? profile.getAverageRating() : 0.0);
        s.setReviewCount(profile.getTotalReviews() != null ? profile.getTotalReviews() : 0);
        // Client-facing price = expert rate + commission; expertHourlyRate = what expert earns
        Double hourlyRate = profile.getHourlyRate();
        s.setSessionPrice(hourlyRate != null ? pricingService.getClientHourlyRate(hourlyRate) : null);
        s.setExpertHourlyRate(hourlyRate);

        // Compute presence status from heartbeat-based logic
        boolean isOnline = computeIsOnlineFromProfile(profile, user);
        s.setIsOnline(isOnline);
        s.setAvailability(isOnline ? "Online" : "Offline");
        s.setStatus(computeStatusString(profile));
        s.setLastSeen(profile.getLastActivityAt());
        return s;
    }

    private ExpertProfileResponse buildPublicResponse(User user, ExpertProfile profile) {
        ExpertProfileResponse response = new ExpertProfileResponse();
        response.setId(profile.getId());
        response.setUserId(user.getId());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setCountry(firstNonBlank(profile.getCountry(), user.getCountry()));
        response.setProfessionalTitle(profile.getProfessionalTitle());
        response.setCategory(profile.getCategory());
        response.setSubCategory(profile.getSubCategory());
        response.setYearsOfExperience(profile.getYearsOfExperience());
        response.setBio(profile.getBio());
        response.setHourlyRate(profile.getHourlyRate());
        // Client-facing price includes platform commission
        Double baseRate = profile.getHourlyRate();
        response.setClientHourlyRate(baseRate != null ? pricingService.getClientHourlyRate(baseRate) : null);
        // phoneNumber excluded from public view
        response.setLanguages(splitLanguages(profile.getLanguages()));
        response.setLinkedIn(profile.getLinkedIn());
        response.setPortfolio(profile.getPortfolio());
        response.setGithub(profile.getGithub());
        // Rating
        response.setAverageRating(profile.getAverageRating() != null ? profile.getAverageRating() : 0.0);
        response.setTotalReviews(profile.getTotalReviews() != null ? profile.getTotalReviews() : 0);

        // Fetch individual reviews from completed call requests
        List<CallRequest> reviewedCalls = callRequestRepository
                .findByExpertIdAndReviewSubmittedTrueOrderByCreatedAtDesc(profile.getUserId());
        List<ExpertReviewResponse> reviews = reviewedCalls.stream()
                .map(cr -> {
                    ExpertReviewResponse r = new ExpertReviewResponse();
                    r.setCallRequestId(cr.getId());
                    r.setClientName(cr.getClientName() != null ? cr.getClientName() : "Anonymous");
                    r.setRating(cr.getRating());
                    r.setReview(cr.getReview());
                    r.setCreatedAt(cr.getCreatedAt());
                    r.setExpertResponse(cr.getExpertResponse());
                    r.setExpertRespondedAt(cr.getExpertRespondedAt());
                    return r;
                })
                .toList();
        response.setReviews(reviews);

        // Computed presence from heartbeat-based logic
        boolean isOnline = computeIsOnlineFromProfile(profile, user);
        response.setIsOnline(isOnline);
        response.setStatus(computeStatusString(profile));
        response.setLastSeen(profile.getLastActivityAt());
        response.setIsApproved(true);
        response.setProfileExists(true);
        response.setProfileCompleted(user.getProfileCompleted());
        response.setCreatedAt(profile.getCreatedAt());
        response.setUpdatedAt(profile.getUpdatedAt());
        return response;
    }

    private boolean matchesTextSearch(ExpertSummaryResponse s, String query) {
        String target = String.join(" ",
                Objects.toString(s.getName(), ""),
                Objects.toString(s.getProfessionalTitle(), ""),
                Objects.toString(s.getCategory(), ""),
                Objects.toString(s.getSubCategory(), ""),
                Objects.toString(s.getCountry(), ""),
                s.getLanguages() != null ? String.join(" ", s.getLanguages()) : ""
        ).toLowerCase();
        return target.contains(query);
    }

    private void addExperienceCriteria(Query query, String experience) {
        if (!isNotEmpty(experience)) return;
        switch (experience) {
            case "0-2 years" -> {
                query.addCriteria(Criteria.where("yearsOfExperience").gte(0));
                query.addCriteria(Criteria.where("yearsOfExperience").lte(2));
            }
            case "3-5 years" -> {
                query.addCriteria(Criteria.where("yearsOfExperience").gte(3));
                query.addCriteria(Criteria.where("yearsOfExperience").lte(5));
            }
            case "6-10 years" -> {
                query.addCriteria(Criteria.where("yearsOfExperience").gte(6));
                query.addCriteria(Criteria.where("yearsOfExperience").lte(10));
            }
            case "10+ years" -> query.addCriteria(Criteria.where("yearsOfExperience").gte(10));
        }
    }

    private void addPriceCriteria(Query query, String price) {
        if (!isNotEmpty(price)) return;
        // UI sends INR labels — rates are stored in INR/hour
        switch (price) {
            case "Under ₹500" -> query.addCriteria(Criteria.where("hourlyRate").lt(500.0));
            case "₹500 - ₹1000" -> {
                query.addCriteria(Criteria.where("hourlyRate").gte(500.0));
                query.addCriteria(Criteria.where("hourlyRate").lte(1000.0));
            }
            case "₹1000+" -> query.addCriteria(Criteria.where("hourlyRate").gt(1000.0));
            // Legacy USD labels — kept for backward compatibility
            case "Under $40" -> query.addCriteria(Criteria.where("hourlyRate").lt(40.0));
            case "$40 - $70" -> {
                query.addCriteria(Criteria.where("hourlyRate").gte(40.0));
                query.addCriteria(Criteria.where("hourlyRate").lte(70.0));
            }
            case "$70+" -> query.addCriteria(Criteria.where("hourlyRate").gt(70.0));
        }
    }

    private void addRatingCriteria(Query query, String rating) {
        if (!isNotEmpty(rating)) return;
        switch (rating) {
            case "4.5+" -> query.addCriteria(Criteria.where("averageRating").gte(4.5));
            case "4.0+" -> query.addCriteria(Criteria.where("averageRating").gte(4.0));
            case "3.5+" -> query.addCriteria(Criteria.where("averageRating").gte(3.5));
        }
    }

    private void applySort(Query query, String sort) {
        // isOnline is now heartbeat-computed, so MongoDB sorting on isOnline is not accurate.
        // We do all sorting in-memory in sortInMemory().
        // Only apply MongoDB sort for fields that don't need computation.
        if ("Lowest Price".equalsIgnoreCase(sort)) {
            query.with(Sort.by(Sort.Direction.ASC, "hourlyRate"));
        } else if ("Highest Price".equalsIgnoreCase(sort)) {
            query.with(Sort.by(Sort.Direction.DESC, "hourlyRate"));
        } else if ("Most Experienced".equalsIgnoreCase(sort)) {
            query.with(Sort.by(Sort.Direction.DESC, "yearsOfExperience"));
        }
        // For "Most Relevant" and "Highest Rated", no MongoDB sort is applied;
        // sorting is handled in-memory via sortInMemory().
    }

    private List<ExpertSummaryResponse> sortInMemory(List<ExpertSummaryResponse> list, String sort, String q) {
        List<ExpertSummaryResponse> sorted = new ArrayList<>(list);
        String sortKey = isNotEmpty(sort) ? sort.toLowerCase() : "";

        if ("most relevant".equals(sortKey) || !isNotEmpty(sort)) {
            // Most Relevant: online first (computed), then by name
            sorted.sort(Comparator
                    .comparing(ExpertSummaryResponse::getIsOnline, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(ExpertSummaryResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase)));
        } else if ("highest rated".equals(sortKey)) {
            // Highest Rated: by rating desc, then online first, then by name
            sorted.sort(Comparator
                    .comparing(ExpertSummaryResponse::getRating, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(ExpertSummaryResponse::getIsOnline, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(ExpertSummaryResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase)));
        } else if ("lowest price".equals(sortKey)) {
            // Lowest Price: already sorted by MongoDB, just stable sort
            // Keep as-is from MongoDB sort
        } else if ("highest price".equals(sortKey)) {
            // Already sorted by MongoDB
        } else if ("most experienced".equals(sortKey)) {
            // Already sorted by MongoDB
        }

        return sorted;
    }

    private List<String> splitLanguages(String languages) {
        if (languages == null || languages.isBlank()) {
            return List.of();
        }
        return Arrays.stream(languages.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) return primary.trim();
        if (fallback != null && !fallback.isBlank()) return fallback.trim();
        return null;
    }

    private boolean isNotEmpty(String value) {
        return value != null && !value.isBlank() && !"Any".equalsIgnoreCase(value);
    }
}
