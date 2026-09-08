package com.example.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true)
    private String phone = "";

    @Column(nullable = true)
    private String countryCode = "+91";

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String provider = "LOCAL";

    @Column(nullable = false)
    private String role = "USER";

    @Column(nullable = false)
    private Boolean emailVerified = false;

    @Column(nullable = false)
    private Boolean phoneVerified = false;

    @Column(nullable = false)
    private Boolean jobAlertsEnabled = true;

    /**
     * User skills stored as comma-separated string
     * Example: "Java, Spring Boot, React, MySQL"
     */
    @Column(columnDefinition = "TEXT")
    private String skills = "";

    /**
     * Job title or role
     * Example: "Full Stack Developer"
     */
    private String jobTitle = "";

    /**
     * Years of experience
     */
    private Integer experience = 0;

    /**
     * Recruiter / Employer Profile Fields
     */
    @Column(name = "company_name")
    private String companyName = "";

    @Column(name = "company_website")
    private String companyWebsite = "";

    @Column(name = "company_industry")
    private String companyIndustry = "";

    @Column(name = "company_location")
    private String companyLocation = "";

    /**
     * Candidate Resume Storage
     */
    @Column(name = "resume_file_name")
    private String resumeFileName = "";

    @Column(name = "resume_text", columnDefinition = "TEXT")
    private String resumeText = "";

    @Column(name = "resume_uploaded_at")
    private java.time.LocalDateTime resumeUploadedAt;


    @PrePersist
    @PreUpdate
    public void prePersist() {
        if (this.role == null || this.role.isBlank()) {
            this.role = "USER";
        }
        if (this.provider == null || this.provider.isBlank()) {
            this.provider = "LOCAL";
        }
        if (this.phone == null) {
            this.phone = "";
        }
        if (this.countryCode == null || this.countryCode.isBlank()) {
            this.countryCode = "+91";
        }
        if (this.emailVerified == null) {
            this.emailVerified = false;
        }
        if (this.phoneVerified == null) {
            this.phoneVerified = false;
        }
        if (this.jobAlertsEnabled == null) {
            this.jobAlertsEnabled = true;
        }
        if (this.skills == null) {
            this.skills = "";
        }
        if (this.jobTitle == null) {
            this.jobTitle = "";
        }
        if (this.experience == null) {
            this.experience = 0;
        }
    }
}