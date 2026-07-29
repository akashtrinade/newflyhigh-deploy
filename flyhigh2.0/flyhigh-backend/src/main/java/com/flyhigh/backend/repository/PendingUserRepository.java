package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.PendingUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PendingUserRepository extends MongoRepository<PendingUser, String> {
    Optional<PendingUser> findByEmail(String email);
    boolean existsByEmail(String email);
    void deleteByEmail(String email);
}
