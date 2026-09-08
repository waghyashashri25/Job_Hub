package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "jobs", indexes = {
    @Index(name = "idx_title", columnList = "title"),
    @Index(name = "idx_location", columnList = "location"),
    @Index(name = "idx_source", columnList = "source"),
    @Index(name = "idx_company", columnList = "company"),
    @Index(name = "idx_posted_time", columnList = "postedTime"),
    @Index(name = "idx_title_company_source", columnList = "title,company,source"),
    @Index(name = "idx_job_fingerprint", columnList = "fingerprint")
})
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false, length = 2000)
    private String applyLink;

    @Column(length = 64)
    private String fingerprint;

    @Column(nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime postedTime;

    @Column(name = "posted_by_email")
    private String postedByEmail;

    @Column(name = "job_type")
    private String jobType = "Full-Time";

    @Column(name = "salary_range")
    private String salaryRange;

    @Column(name = "experience_required")
    private String experienceRequired;

    @Column(name = "skills_required", columnDefinition = "TEXT")
    private String skillsRequired;

    @Column(name = "status")
    private String status = "ACTIVE";
}
