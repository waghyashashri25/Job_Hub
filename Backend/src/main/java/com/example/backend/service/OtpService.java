package com.example.backend.service;

import com.example.backend.model.VerificationOtp;
import com.example.backend.repository.VerificationOtpRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final Logger logger = LoggerFactory.getLogger(OtpService.class);

    private final VerificationOtpRepository otpRepository;
    private final EmailService emailService;
    private final SmsService smsService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${otp.expiry-minutes:10}")
    private int expiryMinutes;

    public OtpService(VerificationOtpRepository otpRepository,
                      EmailService emailService,
                      SmsService smsService) {
        this.otpRepository = otpRepository;
        this.emailService = emailService;
        this.smsService = smsService;
    }

    /**
     * Generate 6-digit OTP and send via Email or SMS
     */
    @Transactional
    public String generateAndSendOtp(String identifier, String purpose, String userName) {
        return generateAndSendOtp(identifier, purpose, userName, null);
    }

    @Transactional
    public String generateAndSendOtp(String identifier, String purpose, String userName, String existingCode) {
        if (identifier == null || identifier.trim().isBlank()) {
            throw new IllegalArgumentException("Target email or phone is required for OTP");
        }
        String cleanIdentifier = identifier.trim().toLowerCase();

        // Invalidate any previous unused OTPs for this identifier and purpose
        Optional<VerificationOtp> previous = otpRepository.findTopByIdentifierAndPurposeOrderByCreatedAtDesc(
                cleanIdentifier, purpose
        );
        previous.ifPresent(p -> {
            p.setUsed(true);
            otpRepository.save(p);
        });

        // Use existingCode or generate new 6-digit numeric OTP
        String otpCode = (existingCode != null && existingCode.trim().length() == 6)
                ? existingCode.trim()
                : String.format("%06d", secureRandom.nextInt(1_000_000));

        VerificationOtp otp = new VerificationOtp();
        otp.setIdentifier(cleanIdentifier);
        otp.setOtpCode(otpCode);
        otp.setPurpose(purpose.toUpperCase());
        otp.setCreatedAt(LocalDateTime.now());
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(expiryMinutes));
        otp.setUsed(false);
        otp.setAttempts(0);

        otpRepository.save(otp);
        logger.info("Generated OTP for [{}] (purpose: {}): {}", cleanIdentifier, purpose, otpCode);

        // Dispatch via real Email or SMS
        if (cleanIdentifier.contains("@")) {
            switch (purpose.toUpperCase()) {
                case "REGISTRATION" -> emailService.sendRegistrationOtpEmail(cleanIdentifier, userName, otpCode);
                case "LOGIN" -> emailService.sendLoginOtpEmail(cleanIdentifier, userName, otpCode);
                case "FORGOT_PASSWORD" -> emailService.sendForgotPasswordOtpEmail(cleanIdentifier, userName, otpCode);
                default -> emailService.sendRegistrationOtpEmail(cleanIdentifier, userName, otpCode);
            }
        } else {
            smsService.sendOtpSms(cleanIdentifier, otpCode, purpose);
        }

        return otpCode;
    }

    /**
     * Validate an incoming OTP
     */
    @Transactional
    public boolean verifyOtp(String identifier, String purpose, String otpCode) {
        if (identifier == null || otpCode == null) return false;
        String cleanIdentifier = identifier.trim().toLowerCase();
        String cleanCode = otpCode.trim();

        Optional<VerificationOtp> otpOpt = otpRepository.findTopByIdentifierAndPurposeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                cleanIdentifier,
                purpose.toUpperCase(),
                LocalDateTime.now()
        );

        if (otpOpt.isEmpty()) {
            logger.warn("No active, non-expired OTP found for [{}] with purpose [{}]", cleanIdentifier, purpose);
            return false;
        }

        VerificationOtp otp = otpOpt.get();
        if (otp.getAttempts() >= 5) {
            otp.setUsed(true);
            otpRepository.save(otp);
            logger.warn("Max OTP verification attempts exceeded for [{}]", cleanIdentifier);
            throw new RuntimeException("Maximum verification attempts exceeded. Please request a new OTP.");
        }

        if (otp.getOtpCode().equals(cleanCode)) {
            otp.setUsed(true);
            otpRepository.save(otp);
            logger.info("OTP verified successfully for [{}] (purpose: {})", cleanIdentifier, purpose);
            return true;
        } else {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);
            logger.warn("Invalid OTP entered for [{}] (attempt {}/5)", cleanIdentifier, otp.getAttempts());
            return false;
        }
    }
}
