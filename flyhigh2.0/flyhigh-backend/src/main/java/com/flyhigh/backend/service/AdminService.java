package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.AdminConsultationDto;
import com.flyhigh.backend.dto.AdminDashboardStats;
import com.flyhigh.backend.dto.AdminPaymentDto;
import com.flyhigh.backend.dto.AdminUserDto;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionPayment;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.SessionPaymentRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Admin Service — provides dashboard statistics and paginated data for the Admin Portal.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final InteractionRepository interactionRepository;
    private final SessionPaymentRepository sessionPaymentRepository;

    public AdminService(UserRepository userRepository,
                        ExpertProfileRepository expertProfileRepository,
                        InteractionRepository interactionRepository,
                        SessionPaymentRepository sessionPaymentRepository) {
        this.userRepository = userRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.interactionRepository = interactionRepository;
        this.sessionPaymentRepository = sessionPaymentRepository;
    }

    // ═══════════════════════════════════════════
    // DASHBOARD STATS
    // ═══════════════════════════════════════════

    public AdminDashboardStats getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalExperts = userRepository.countByRole("EXPERT");
        long totalClients = userRepository.countByRole("CLIENT");
        long completedConsultations = interactionRepository.countByStatus(
                com.flyhigh.backend.model.SessionStatus.COMPLETED);

        // Count active consultations (ACTIVE or CREATED)
        long activeConsultations = interactionRepository.countByStatus(
                com.flyhigh.backend.model.SessionStatus.ACTIVE)
                + interactionRepository.countByStatus(
                com.flyhigh.backend.model.SessionStatus.CREATED);

        // Today's revenue (payments verified today)
        Instant startOfToday = LocalDate.now().atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant();
        double todayRevenue = sessionPaymentRepository.findAll().stream()
                .filter(p -> p.getChargedAt() != null && p.getChargedAt().isAfter(startOfToday))
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()))
                .mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0.0)
                .sum();

        // Platform revenue (all-time successful payments)
        double platformRevenue = sessionPaymentRepository.findAll().stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()))
                .mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0.0)
                .sum();

        // Pending payouts (all PENDING earnings)
        double pendingPayouts = 0.0; // Placeholder — computed from ExpertEarning repository if needed

        return new AdminDashboardStats()
                .totalUsers(totalUsers)
                .totalExperts(totalExperts)
                .totalClients(totalClients)
                .activeConsultations(activeConsultations)
                .todayRevenue(todayRevenue / 100.0) // Convert paise to rupees
                .platformRevenue(platformRevenue / 100.0)
                .pendingPayouts(pendingPayouts)
                .completedConsultations(completedConsultations);
    }

    // ═══════════════════════════════════════════
    // PAGINATED LISTS
    // ═══════════════════════════════════════════

    private static final int PAGE_SIZE = 20;
    private static final Sort SORT_BY_DATE = Sort.by(Sort.Direction.DESC, "createdAt");

    public List<AdminUserDto> getLatestUsers(int limit) {
        return userRepository.findAll(PageRequest.of(0, limit, SORT_BY_DATE))
                .getContent().stream()
                .map(this::toUserDto)
                .collect(Collectors.toList());
    }

    public List<AdminUserDto> getUsers(int page) {
        return userRepository.findAll(PageRequest.of(page, PAGE_SIZE, SORT_BY_DATE))
                .getContent().stream()
                .map(this::toUserDto)
                .collect(Collectors.toList());
    }

    public List<AdminUserDto> getClients(int page) {
        // Filter users by CLIENT role — using findAll and filtering in-memory for simplicity
        // For production: use a custom query with role filter
        return userRepository.findAll(PageRequest.of(page, PAGE_SIZE, SORT_BY_DATE))
                .getContent().stream()
                .filter(u -> "CLIENT".equalsIgnoreCase(u.getRole()))
                .map(this::toUserDto)
                .collect(Collectors.toList());
    }

    public List<AdminUserDto> getExperts(int page) {
        return userRepository.findAll(PageRequest.of(page, PAGE_SIZE, SORT_BY_DATE))
                .getContent().stream()
                .filter(u -> "EXPERT".equalsIgnoreCase(u.getRole()))
                .map(this::toUserDto)
                .collect(Collectors.toList());
    }

    public List<AdminConsultationDto> getConsultations(int page) {
        return interactionRepository.findAll(PageRequest.of(page, PAGE_SIZE, SORT_BY_DATE))
                .getContent().stream()
                .map(this::toConsultationDto)
                .collect(Collectors.toList());
    }

    public List<AdminPaymentDto> getPayments(int page) {
        return sessionPaymentRepository.findAll(PageRequest.of(page, PAGE_SIZE, SORT_BY_DATE))
                .getContent().stream()
                .map(this::toPaymentDto)
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════
    // DTO MAPPERS
    // ═══════════════════════════════════════════

    private AdminUserDto toUserDto(User user) {
        return new AdminUserDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getCountry(),
                user.getIsActive(),
                user.getIsAdmin(),
                user.getCreatedAt()
        );
    }

    private AdminConsultationDto toConsultationDto(Interaction interaction) {
        return new AdminConsultationDto(
                interaction.getId(),
                interaction.getClientId(),
                interaction.getExpertId(),
                interaction.getStatus() != null ? interaction.getStatus().name() : "UNKNOWN",
                interaction.getStartedAt()
        );
    }

    private AdminPaymentDto toPaymentDto(SessionPayment payment) {
        return new AdminPaymentDto(
                payment.getId(),
                payment.getAmount() != null ? payment.getAmount() : 0.0,
                "INR",
                payment.getStatus() != null ? payment.getStatus() : "UNKNOWN",
                payment.getChargedAt()
        );
    }
}
