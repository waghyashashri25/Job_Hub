package com.example.backend.repository;

import com.example.backend.model.VerificationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationOtpRepository extends JpaRepository<VerificationOtp, Long> {

    Optional<VerificationOtp> findTopByIdentifierAndPurposeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String identifier,
            String purpose,
            LocalDateTime now
    );

    Optional<VerificationOtp> findTopByIdentifierAndPurposeOrderByCreatedAtDesc(
            String identifier,
            String purpose
    );

    void deleteByExpiresAtBefore(LocalDateTime time);
}
