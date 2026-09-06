package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.model.CallRequest;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.CallRequestRepository;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Public service — provides aggregated home page statistics.
 * No authentication required. All data is read-only and public-safe.
 */
@Service
public class PublicService {

    private static final Logger log = LoggerFactory.getLogger(PublicService.class);

    private final UserRepository userRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final InteractionRepository interactionRepository;
    private final CallRequestRepository callRequestRepository;

    public PublicService(UserRepository userRepository,
                         ExpertProfileRepository expertProfileRepository,
                         InteractionRepository interactionRepository,
                         CallRequestRepository callRequestRepository) {
        this.userRepository = userRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.interactionRepository = interactionRepository;
        this.callRequestRepository = callRequestRepository;
    }

    public HomePageStatsResponse getHomePageStats() {
        // ── Basic counts ──
        long totalUsers = userRepository.count();
        long verifiedExperts = expertProfileRepository.countByIsApprovedTrue();
        long totalConsultations = interactionRepository.countByStatus(SessionStatus.COMPLETED);

        // ── Average rating (weighted by review count across approved experts) ──
        double averageRating = computePlatformAverageRating();

        // ── Featured experts (top 4 approved, sorted by rating desc) ──
        List<FeaturedExpertDto> featuredExperts = buildFeaturedExperts();

        // ── Category counts (group approved experts by category) ──
        List<CategoryCountDto> categoryCounts = buildCategoryCounts();

        // ── Recent reviews (latest 6 with high ratings) ──
        List<ReviewDto> recentReviews = buildRecentReviews();

        log.info("Home page stats: users={}, experts={}, consultations={}, rating={}",
                totalUsers, verifiedExperts, totalConsultations, averageRating);

        return new HomePageStatsResponse()
                .totalUsers(totalUsers)
                .verifiedExperts(verifiedExperts)
                .totalConsultations(totalConsultations)
                .averageRating(Math.round(averageRating * 10.0) / 10.0)
                .featuredExperts(featuredExperts)
                .categoryCounts(categoryCounts)
                .recentReviews(recentReviews);
    }

    // ── Private helpers ──

    /**
     * Compute platform-wide average rating as a weighted average
     * across all approved experts that have at least one review.
     */
    private double computePlatformAverageRating() {
        List<ExpertProfile> approved = expertProfileRepository.findByIsApprovedTrue();
        if (approved.isEmpty()) return 0.0;

        double totalWeightedRating = 0.0;
        long totalReviews = 0;

        for (ExpertProfile ep : approved) {
            if (ep.getTotalReviews() != null && ep.getTotalReviews() > 0
                    && ep.getAverageRating() != null && ep.getAverageRating() > 0) {
                totalWeightedRating += ep.getAverageRating() * ep.getTotalReviews();
                totalReviews += ep.getTotalReviews();
            }
        }

        return totalReviews > 0 ? totalWeightedRating / totalReviews : 0.0;
    }

    /**
     * Build the top 4 featured experts for the home page.
     * Prefers approved experts who are online, sorted by rating desc.
     */
    private List<FeaturedExpertDto> buildFeaturedExperts() {
        List<ExpertProfile> approved = expertProfileRepository.findByIsApprovedTrue();
        if (approved.isEmpty()) return Collections.emptyList();

        // Collect userIds for batch name resolution
        List<ExpertProfile> sorted = approved.stream()
                .sorted(Comparator
                        .comparing(ExpertProfile::getIsOnline).reversed()
                        .thenComparing(ExpertProfile::getAverageRating, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(ExpertProfile::getTotalReviews, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(4)
                .toList();

        Set<String> userIds = sorted.stream()
                .map(ExpertProfile::getUserId)
                .collect(Collectors.toSet());

        // Batch-load user names
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return sorted.stream()
                .map(ep -> {
                    User user = userMap.get(ep.getUserId());
                    String name = user != null ? user.getFullName() : "Expert";
                    String initials = computeInitials(user);
                    double rating = ep.getAverageRating() != null ? ep.getAverageRating() : 0.0;
                    int reviewCount = ep.getTotalReviews() != null ? ep.getTotalReviews() : 0;
                    double hourlyRate = ep.getHourlyRate() != null ? ep.getHourlyRate() : 0.0;

                    return new FeaturedExpertDto(
                            ep.getId(), name, ep.getCategory(),
                            rating, reviewCount, hourlyRate,
                            Boolean.TRUE.equals(ep.getIsOnline()), initials);
                })
                .collect(Collectors.toList());
    }

    /**
     * Group approved experts by category and count them.
     */
    private List<CategoryCountDto> buildCategoryCounts() {
        List<ExpertProfile> approved = expertProfileRepository.findByIsApprovedTrue();

        Map<String, Long> counts = approved.stream()
                .filter(ep -> ep.getCategory() != null && !ep.getCategory().isBlank())
                .collect(Collectors.groupingBy(ExpertProfile::getCategory, Collectors.counting()));

        return counts.entrySet().stream()
                .map(e -> new CategoryCountDto(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CategoryCountDto::getName))
                .collect(Collectors.toList());
    }

    /**
     * Fetch the latest 3 reviews with rating >= 4 for the testimonials section.
     * Reviews are stored as CallRequest documents (call_requests collection), not in the reviews collection.
     */
    private List<ReviewDto> buildRecentReviews() {
        // Fetch latest reviewed calls (page 0, size 30, sorted by createdAt desc)
        List<CallRequest> latest = callRequestRepository
                .findByReviewSubmittedTrueAndReviewNotNullOrderByCreatedAtDesc(
                        PageRequest.of(0, 30, Sort.by(Sort.Direction.DESC, "createdAt"))
                );

        if (latest.isEmpty()) return Collections.emptyList();

        // Filter for rating >= 4 and take top 3
        List<CallRequest> topReviews = latest.stream()
                .filter(r -> r.getRating() != null && r.getRating() >= 4)
                .limit(3)
                .toList();

        if (topReviews.isEmpty()) return Collections.emptyList();

        return topReviews.stream()
                .map(r -> {
                    String clientName = r.getClientName() != null && !r.getClientName().isBlank()
                            ? r.getClientName()
                            : "Client";
                    return new ReviewDto(
                            clientName,
                            r.getRating() != null ? r.getRating() : 5,
                            r.getReview() != null ? r.getReview() : "",
                            r.getCreatedAt() != null ? r.getCreatedAt() : java.time.Instant.now());
                })
                .collect(Collectors.toList());
    }

    /**
     * Compute display initials from User's first and last name.
     */
    private String computeInitials(User user) {
        if (user == null) return "EX";
        String first = user.getFirstName() != null ? user.getFirstName() : "";
        String last = user.getLastName() != null ? user.getLastName() : "";
        StringBuilder sb = new StringBuilder();
        if (!first.isEmpty()) sb.append(first.charAt(0));
        if (!last.isEmpty()) sb.append(last.charAt(0));
        return sb.length() > 0 ? sb.toString().toUpperCase() : "EX";
    }
}
