package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByIsSeedDataTrue();
    long countByIsSeedDataTrueAndRole(String role);
    List<User> findByIsSeedDataTrueAndRole(String role);
    void deleteByIsSeedDataTrueOrSeedSource(String seedSource);
    long countByIsAdminTrue();
    long countByRole(String role);
    Page<User> findByRole(String role, Pageable pageable);
}
