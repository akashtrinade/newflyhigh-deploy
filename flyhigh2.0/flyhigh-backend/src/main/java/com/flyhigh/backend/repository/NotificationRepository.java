package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByUserIdOrderByTimestampDesc(String userId, Pageable pageable);

    Page<Notification> findByUserEmailOrderByTimestampDesc(String userEmail, Pageable pageable);

    long countByUserIdAndReadIsFalse(String userId);
}
