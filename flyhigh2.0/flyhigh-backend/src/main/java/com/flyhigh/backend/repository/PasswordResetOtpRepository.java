package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.PasswordResetOtp;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends MongoRepository<PasswordResetOtp, String> {
    Optional<PasswordResetOtp> findByEmail(String email);
    void deleteByEmail(String email);
}
