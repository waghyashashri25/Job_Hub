package com.example.backend.controller;

import com.example.backend.dto.JobMatchAnalysisDto;
import com.example.backend.dto.ResumeDataDto;
import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.JobRepository;
import com.example.backend.service.CareerIntelligenceService;
import com.example.backend.service.ResumeParserService;
import com.example.backend.service.UserService;
import com.example.backend.config.JwtUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private final ResumeParserService resumeParserService;
    private final CareerIntelligenceService careerIntelligenceService;
    private final JobRepository jobRepository;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public ResumeController(ResumeParserService resumeParserService,
                            CareerIntelligenceService careerIntelligenceService,
                            JobRepository jobRepository,
                            UserService userService,
                            JwtUtil jwtUtil) {
        this.resumeParserService = resumeParserService;
        this.careerIntelligenceService = careerIntelligenceService;
        this.jobRepository = jobRepository;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Upload and parse resume file (PDF, DOCX, TXT)
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeDataDto> uploadAndParseResume(@RequestParam("file") MultipartFile file) {
        ResumeDataDto parsed = resumeParserService.parseFile(file);
        return ResponseEntity.ok(parsed);
    }

    /**
     * Parse raw text resume
     */
    @PostMapping("/parse-text")
    public ResponseEntity<ResumeDataDto> parseRawTextResume(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ResumeDataDto parsed = resumeParserService.parseText(text);
        return ResponseEntity.ok(parsed);
    }

    /**
     * Analyze matching between candidate resume/skills and a specific job
     */
    @PostMapping("/analyze-job")
    public ResponseEntity<JobMatchAnalysisDto> analyzeJobMatch(@RequestBody AnalyzeJobRequest request) {
        Job job = null;
        if (request.getJobId() != null) {
            job = jobRepository.findById(request.getJobId()).orElse(null);
        }

        if (job == null) {
            job = new Job();
            job.setId(0L);
            job.setTitle(request.getJobTitle() != null ? request.getJobTitle() : "Software Engineer");
            job.setCompany(request.getCompany() != null ? request.getCompany() : "Tech Company");
            job.setLocation(request.getLocation() != null ? request.getLocation() : "Remote");
            job.setDescription(request.getJobDescription() != null ? request.getJobDescription() : "");
            job.setSource("Aggregated");
            job.setApplyLink("https://jobhub.local");
        }

        List<String> skills = request.getSkills();
        int expYears = request.getExperienceYears() != null ? request.getExperienceYears() : 2;

        JobMatchAnalysisDto analysis = careerIntelligenceService.analyzeJobMatch(job, skills, expYears);
        return ResponseEntity.ok(analysis);
    }

    /**
     * Save extracted resume skills and experience to authenticated user profile
     */
    @PostMapping("/sync-profile")
    public ResponseEntity<?> syncResumeToProfile(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody SyncProfileRequest request) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                String email = jwtUtil.extractEmail(token.substring(7));
                User user = userService.findByEmail(email);

                if (request.getSkills() != null && !request.getSkills().isEmpty()) {
                    user.setSkills(String.join(", ", request.getSkills()));
                }
                if (request.getJobTitle() != null && !request.getJobTitle().isBlank()) {
                    user.setJobTitle(request.getJobTitle());
                }
                if (request.getExperienceYears() != null) {
                    user.setExperience(request.getExperienceYears());
                }

                User updated = userService.updateUser(user);
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity.ok(Map.of("message", "Synced locally for guest user"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    public static class AnalyzeJobRequest {
        private Long jobId;
        private String jobTitle;
        private String company;
        private String location;
        private String jobDescription;
        private List<String> skills;
        private Integer experienceYears;

        public Long getJobId() { return jobId; }
        public void setJobId(Long jobId) { this.jobId = jobId; }
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        public String getCompany() { return company; }
        public void setCompany(String company) { this.company = company; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getJobDescription() { return jobDescription; }
        public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }
        public List<String> getSkills() { return skills; }
        public void setSkills(List<String> skills) { this.skills = skills; }
        public Integer getExperienceYears() { return experienceYears; }
        public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
    }

    public static class SyncProfileRequest {
        private List<String> skills;
        private String jobTitle;
        private Integer experienceYears;

        public List<String> getSkills() { return skills; }
        public void setSkills(List<String> skills) { this.skills = skills; }
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        public Integer getExperienceYears() { return experienceYears; }
        public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
    }
}
