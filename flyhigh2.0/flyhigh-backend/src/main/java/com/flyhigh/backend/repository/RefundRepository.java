package com.flyhigh.backend.repository;

import com.flyhigh.backend.model.Refund;
import com.flyhigh.backend.model.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends MongoRepository<Refund, String> {

    List<Refund> findByInteractionId(String interactionId);

    Optional<Refund> findByDisputeId(String disputeId);

    Optional<Refund> findByPaymentId(String paymentId);

    Optional<Refund> findByRazorpayRefundId(String razorpayRefundId);

    List<Refund> findByStatusOrderByCreatedAtDesc(RefundStatus status);

    Page<Refund> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
