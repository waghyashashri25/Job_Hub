package com.example.backend.controller;

import com.example.backend.dto.CareerRoadmapDto;
import com.example.backend.dto.JobMatchAnalysisDto;
import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import com.example.backend.service.CareerIntelligenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/career")
public class CareerController {

    private final CareerIntelligenceService careerIntelligenceService;
    private final JobRepository jobRepository;

    public CareerController(CareerIntelligenceService careerIntelligenceService, JobRepository jobRepository) {
        this.careerIntelligenceService = careerIntelligenceService;
        this.jobRepository = jobRepository;
    }

    /**
     * Generate step-by-step career milestone roadmap
     */
    @PostMapping("/roadmap")
    public ResponseEntity<CareerRoadmapDto> generateRoadmap(@RequestBody CareerRoadmapRequest request) {
        CareerRoadmapDto roadmap = careerIntelligenceService.generateCareerRoadmap(
                request.getCurrentRole(),
                request.getTargetRole(),
                request.getSkills(),
                request.getExperienceYears() != null ? request.getExperienceYears() : 2
        );
        return ResponseEntity.ok(roadmap);
    }

    /**
     * Predict market salary compensation
     */
    @PostMapping("/salary-predictor")
    public ResponseEntity<CareerRoadmapDto.SalaryBenchmark> predictSalary(@RequestBody SalaryPredictorRequest request) {
        CareerRoadmapDto.SalaryBenchmark salary = careerIntelligenceService.predictSalary(
                request.getRole(),
                request.getLocation(),
                request.getExperienceYears() != null ? request.getExperienceYears() : 2,
                request.getSkills()
        );
        return ResponseEntity.ok(salary);
    }

    /**
     * Get tailored interview questions for a specific job
     */
    @GetMapping("/interview-prep/{jobId}")
    public ResponseEntity<List<JobMatchAnalysisDto.InterviewQuestion>> getInterviewPrep(
            @PathVariable Long jobId,
            @RequestParam(required = false) List<String> skills) {
        Job job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            job = new Job();
            job.setTitle("Software Engineer");
        }
        JobMatchAnalysisDto analysis = careerIntelligenceService.analyzeJobMatch(job, skills, 3);
        return ResponseEntity.ok(analysis.getInterviewPrepQuestions());
    }

    /**
     * Generate customized AI cover letter
     */
    @PostMapping("/cover-letter")
    public ResponseEntity<Map<String, String>> generateCoverLetter(@RequestBody CoverLetterRequest request) {
        String coverLetter = careerIntelligenceService.generateCoverLetter(
                request.getCandidateName(),
                request.getCandidateTitle(),
                request.getCandidateSkills(),
                request.getExperienceYears(),
                request.getJobTitle(),
                request.getCompany(),
                request.getLocation(),
                request.getJobDescription()
        );
        return ResponseEntity.ok(Map.of("coverLetter", coverLetter));
    }

    /**
     * Generate intelligent status-aware follow up message for recruiters
     */
    @PostMapping("/follow-up-message")
    public ResponseEntity<Map<String, String>> generateFollowUpMessage(@RequestBody FollowUpMessageRequest request) {
        String message = careerIntelligenceService.generateFollowUpMessage(
                request.getCandidateName(),
                request.getJobTitle(),
                request.getCompany(),
                request.getStatus(),
                request.getAppliedDate(),
                request.getInterviewTime(),
                request.getInterviewRound(),
                request.getInterviewMeetingLink(),
                request.getOfferDesignation(),
                request.getOfferSalary(),
                request.getOfferJoiningDate(),
                request.getCustomContext()
        );
        return ResponseEntity.ok(Map.of("message", message));
    }

    public static class FollowUpMessageRequest {
        private String candidateName;
        private String jobTitle;
        private String company;
        private String status;
        private String appliedDate;
        private String interviewTime;
        private String interviewRound;
        private String interviewMeetingLink;
        private String offerDesignation;
        private String offerSalary;
        private String offerJoiningDate;
        private String customContext;

        public String getCandidateName() { return candidateName; }
        public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        public String getCompany() { return company; }
        public void setCompany(String company) { this.company = company; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getAppliedDate() { return appliedDate; }
        public void setAppliedDate(String appliedDate) { this.appliedDate = appliedDate; }
        public String getInterviewTime() { return interviewTime; }
        public void setInterviewTime(String interviewTime) { this.interviewTime = interviewTime; }
        public String getInterviewRound() { return interviewRound; }
        public void setInterviewRound(String interviewRound) { this.interviewRound = interviewRound; }
        public String getInterviewMeetingLink() { return interviewMeetingLink; }
        public void setInterviewMeetingLink(String interviewMeetingLink) { this.interviewMeetingLink = interviewMeetingLink; }
        public String getOfferDesignation() { return offerDesignation; }
        public void setOfferDesignation(String offerDesignation) { this.offerDesignation = offerDesignation; }
        public String getOfferSalary() { return offerSalary; }
        public void setOfferSalary(String offerSalary) { this.offerSalary = offerSalary; }
        public String getOfferJoiningDate() { return offerJoiningDate; }
        public void setOfferJoiningDate(String offerJoiningDate) { this.offerJoiningDate = offerJoiningDate; }
        public String getCustomContext() { return customContext; }
        public void setCustomContext(String customContext) { this.customContext = customContext; }
    }

    public static class CoverLetterRequest {
        private String candidateName;
        private String candidateTitle;
        private List<String> candidateSkills;
        private Integer experienceYears;
        private String jobTitle;
        private String company;
        private String location;
        private String jobDescription;

        public String getCandidateName() { return candidateName; }
        public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
        public String getCandidateTitle() { return candidateTitle; }
        public void setCandidateTitle(String candidateTitle) { this.candidateTitle = candidateTitle; }
        public List<String> getCandidateSkills() { return candidateSkills; }
        public void setCandidateSkills(List<String> candidateSkills) { this.candidateSkills = candidateSkills; }
        public Integer getExperienceYears() { return experienceYears; }
        public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        public String getCompany() { return company; }
        public void setCompany(String company) { this.company = company; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getJobDescription() { return jobDescription; }
        public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }
    }

    public static class CareerRoadmapRequest {
        private String currentRole;
        private String targetRole;
        private List<String> skills;
        private Integer experienceYears;

        public String getCurrentRole() { return currentRole; }
        public void setCurrentRole(String currentRole) { this.currentRole = currentRole; }
        public String getTargetRole() { return targetRole; }
        public void setTargetRole(String targetRole) { this.targetRole = targetRole; }
        public List<String> getSkills() { return skills; }
        public void setSkills(List<String> skills) { this.skills = skills; }
        public Integer getExperienceYears() { return experienceYears; }
        public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
    }

    public static class SalaryPredictorRequest {
        private String role;
        private String location;
        private Integer experienceYears;
        private List<String> skills;

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public Integer getExperienceYears() { return experienceYears; }
        public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
        public List<String> getSkills() { return skills; }
        public void setSkills(List<String> skills) { this.skills = skills; }
    }
}
