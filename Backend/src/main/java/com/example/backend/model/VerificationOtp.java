package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "verification_otps", indexes = {
    @Index(name = "idx_otp_identifier_purpose", columnList = "identifier, purpose")
})
public class VerificationOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String identifier; // Email or phone number

    @Column(nullable = false, length = 6)
    private String otpCode;

    @Column(nullable = false, length = 32)
    private String purpose; // REGISTRATION, LOGIN, FORGOT_PASSWORD

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private Boolean used = false;

    @Column(nullable = false)
    private Integer attempts = 0;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public boolean isValid(String code) {
        return !Boolean.TRUE.equals(this.used) && !isExpired() && this.otpCode.equals(code);
    }
}
