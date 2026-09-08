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
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private LocalDateTime savedAt;

    @Column(name = "interview_time")
    private String interviewTime;

    @Column(name = "interview_meeting_link")
    private String interviewMeetingLink;

    @Column(name = "interview_round")
    private String interviewRound;

    @Column(name = "recruiter_rating")
    private Integer recruiterRating = 0;

    /**
     * Offer Letter Details
     */
    @Column(name = "offer_salary")
    private String offerSalary;

    @Column(name = "offer_designation")
    private String offerDesignation;

    @Column(name = "offer_joining_date")
    private String offerJoiningDate;

    @Column(name = "offer_benefits", columnDefinition = "TEXT")
    private String offerBenefits;

    @Column(name = "offer_sent_at")
    private LocalDateTime offerSentAt;
}
