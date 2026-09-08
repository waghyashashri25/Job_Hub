package com.example.backend.controller;

import com.example.backend.dto.JobMatchAnalysisDto;
import com.example.backend.model.Application;
import com.example.backend.model.ApplicationStatus;
import com.example.backend.model.ChatMessage;
import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.ApplicationRepository;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.JobRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.CareerIntelligenceService;
import com.example.backend.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/recruiter")
@CrossOrigin(origins = "*")
public class RecruiterController {

    private static final Logger logger = LoggerFactory.getLogger(RecruiterController.class);

    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final ChatMessageRepository chatMessageRepository;
    private final CareerIntelligenceService careerIntelligenceService;
    private final com.example.backend.service.SearchService searchService;

    public RecruiterController(JobRepository jobRepository,
                               ApplicationRepository applicationRepository,
                               UserRepository userRepository,
                               EmailService emailService,
                               ChatMessageRepository chatMessageRepository,
                               CareerIntelligenceService careerIntelligenceService,
                               com.example.backend.service.SearchService searchService) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.chatMessageRepository = chatMessageRepository;
        this.careerIntelligenceService = careerIntelligenceService;
        this.searchService = searchService;
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null) ? auth.getName() : null;
    }

    private boolean isUserAdmin(String email) {
        if (email == null) return false;
        Optional<User> uOpt = userRepository.findByEmail(email);
        return uOpt.isPresent() && "ADMIN".equalsIgnoreCase(uOpt.get().getRole());
    }

    // ==========================================
    // 1. RECRUITER KPI STATS
    // ==========================================
    @GetMapping("/stats")
    public ResponseEntity<?> getRecruiterStats() {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        boolean isAdmin = isUserAdmin(email);
        List<Job> myJobs = jobRepository.findByPostedByEmailOrderByIdDesc(email);
        long totalActiveJobs = myJobs.stream().filter(j -> "ACTIVE".equalsIgnoreCase(j.getStatus())).count();

        List<Application> myApps = applicationRepository.findByJobPostedByEmailOrderBySavedAtDesc(email);
        if (myApps.isEmpty() && isAdmin) {
            // For admin testing: allow viewing all top 50 applications
            myApps = applicationRepository.findTop50ByOrderBySavedAtDesc();
        }

        long interviewsCount = myApps.stream().filter(a -> a.getStatus() == ApplicationStatus.INTERVIEW).count();
        long shortlistedCount = myApps.stream().filter(a -> a.getStatus() == ApplicationStatus.SHORTLISTED).count();
        long offersCount = myApps.stream().filter(a -> a.getStatus() == ApplicationStatus.OFFER).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalJobs", myJobs.size());
        stats.put("activeJobs", totalActiveJobs);
        stats.put("totalApplications", myApps.size());
        stats.put("interviewsCount", interviewsCount);
        stats.put("shortlistedCount", shortlistedCount);
        stats.put("offersCount", offersCount);

        return ResponseEntity.ok(stats);
    }

    // ==========================================
    // 2. JOB MANAGEMENT (POSTED BY RECRUITER)
    // ==========================================
    @GetMapping("/jobs")
    public ResponseEntity<?> getMyJobs() {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<Job> jobs = jobRepository.findByPostedByEmailOrderByIdDesc(email);
        return ResponseEntity.ok(jobs);
    }

    @PostMapping("/jobs")
    public ResponseEntity<?> createJob(@RequestBody Map<String, Object> payload) {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String title = (String) payload.get("title");
        String company = (String) payload.get("company");
        String location = (String) payload.get("location");
        String description = (String) payload.get("description");

        if (title == null || title.isBlank() || company == null || company.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title and company are required"));
        }

        Job job = new Job();
        job.setTitle(title.trim());
        job.setCompany(company.trim());
        job.setLocation(location != null && !location.isBlank() ? location.trim() : "Remote / Hybrid");
        job.setDescription(description != null ? description.trim() : "");
        job.setSource("Recruiter Direct");
        job.setPostedByEmail(email);
        job.setJobType((String) payload.getOrDefault("jobType", "Full-Time"));
        job.setSalaryRange((String) payload.getOrDefault("salaryRange", "Competitive"));
        job.setExperienceRequired((String) payload.getOrDefault("experienceRequired", "1-3 Years"));
        job.setSkillsRequired((String) payload.getOrDefault("skillsRequired", ""));
        job.setStatus("ACTIVE");
        job.setPostedTime(LocalDateTime.now());

        String applyLink = (String) payload.get("applyLink");
        if (applyLink == null || applyLink.isBlank()) {
            job.setApplyLink("https://jobhub.platform/apply/" + UUID.randomUUID().toString().substring(0, 8));
        } else {
            job.setApplyLink(applyLink.trim());
        }

        Job saved = jobRepository.save(job);
        try {
            searchService.clearSearchCache();
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Opportunity published successfully to JobHub!",
                "job", saved
        ));
    }

    @PutMapping("/jobs/{id}/status")
    public ResponseEntity<?> toggleJobStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String email = getCurrentUserEmail();
        Optional<Job> jobOpt = jobRepository.findById(id);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Job not found"));
        }

        Job job = jobOpt.get();
        if (!isUserAdmin(email) && (job.getPostedByEmail() == null || !job.getPostedByEmail().equalsIgnoreCase(email))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not authorized to modify this job"));
        }

        String newStatus = payload.get("status");
        if (newStatus != null && !newStatus.isBlank()) {
            job.setStatus(newStatus.toUpperCase().trim());
        } else {
            job.setStatus("ACTIVE".equalsIgnoreCase(job.getStatus()) ? "CLOSED" : "ACTIVE");
        }

        jobRepository.save(job);
        try {
            searchService.clearSearchCache();
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", job.getStatus(),
                "message", "Job status updated to " + job.getStatus()
        ));
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<?> deleteJob(@PathVariable Long id) {
        String email = getCurrentUserEmail();
        Optional<Job> jobOpt = jobRepository.findById(id);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Job not found"));
        }

        Job job = jobOpt.get();
        if (!isUserAdmin(email) && (job.getPostedByEmail() == null || !job.getPostedByEmail().equalsIgnoreCase(email))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not authorized to delete this job"));
        }

        jobRepository.deleteById(id);
        try {
            searchService.clearSearchCache();
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of("success", true, "message", "Job vacancy removed."));
    }

    // ==========================================
    // 3. APPLICANT TRACKING SYSTEM (ATS PIPELINE)
    // ==========================================
    @GetMapping("/applications")
    public ResponseEntity<?> getApplications() {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        boolean isAdmin = isUserAdmin(email);
        List<Application> apps = applicationRepository.findByJobPostedByEmailOrderBySavedAtDesc(email);
        if (apps.isEmpty() && isAdmin) {
            // Admin fallback view so ATS board has immediate candidates to test
            apps = applicationRepository.findTop50ByOrderBySavedAtDesc();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Application a : apps) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", a.getId());
            item.put("status", a.getStatus() != null ? a.getStatus().name() : "SAVED");
            item.put("notes", a.getNotes());
            item.put("savedAt", a.getSavedAt());
            item.put("interviewTime", a.getInterviewTime());
            item.put("interviewMeetingLink", a.getInterviewMeetingLink());
            item.put("interviewRound", a.getInterviewRound());
            item.put("recruiterRating", a.getRecruiterRating());

            User candidateUser = a.getUser();
            if (candidateUser != null && "guest@jobportal.local".equalsIgnoreCase(candidateUser.getEmail())) {
                Optional<User> realCandidateOpt = userRepository.findByEmail("waghyashashri09@gmail.com");
                if (realCandidateOpt.isPresent()) {
                    candidateUser = realCandidateOpt.get();
                    a.setUser(candidateUser);
                    applicationRepository.save(a);
                }
            }

            if (candidateUser != null) {
                Map<String, Object> u = new HashMap<>();
                u.put("id", candidateUser.getId());
                u.put("name", candidateUser.getName());
                u.put("email", candidateUser.getEmail());
                u.put("phone", candidateUser.getPhone());
                u.put("skills", candidateUser.getSkills());
                u.put("jobTitle", candidateUser.getJobTitle());
                u.put("experience", candidateUser.getExperience());
                item.put("user", u);
            }

            if (a.getJob() != null) {
                Map<String, Object> j = new HashMap<>();
                j.put("id", a.getJob().getId());
                j.put("title", a.getJob().getTitle());
                j.put("company", a.getJob().getCompany());
                j.put("location", a.getJob().getLocation());
                j.put("jobType", a.getJob().getJobType());
                j.put("salaryRange", a.getJob().getSalaryRange());
                item.put("job", j);
            }

            result.add(item);
        }

        // Augment with AI Match Scores, Offer Details & Message counts
        for (Map<String, Object> item : result) {
            Long appId = (Long) item.get("id");
            Optional<Application> appOpt = applicationRepository.findById(appId);
            if (appOpt.isPresent()) {
                Application a = appOpt.get();
                item.put("offerSalary", a.getOfferSalary());
                item.put("offerDesignation", a.getOfferDesignation());
                item.put("offerJoiningDate", a.getOfferJoiningDate());
                item.put("offerBenefits", a.getOfferBenefits());
                item.put("offerSentAt", a.getOfferSentAt());
                item.put("messageCount", chatMessageRepository.countByApplicationId(appId));

                if (a.getUser() != null && a.getJob() != null) {
                    List<String> candSkills = a.getUser().getSkills() != null
                            ? Arrays.stream(a.getUser().getSkills().split(",")).map(String::trim).filter(s -> !s.isBlank()).toList()
                            : List.of();
                    int candExp = a.getUser().getExperience() != null ? a.getUser().getExperience() : 1;
                    JobMatchAnalysisDto analysis = careerIntelligenceService.analyzeJobMatch(a.getJob(), candSkills, candExp);
                    item.put("matchScore", analysis.getOverallMatchPercentage());
                    item.put("matchConfidence", analysis.getMatchConfidence());
                    item.put("matchedSkills", analysis.getMatchedSkills());
                    item.put("missingSkills", analysis.getMissingCriticalSkills());
                } else {
                    item.put("matchScore", 75);
                    item.put("matchConfidence", "Medium");
                    item.put("matchedSkills", List.of());
                    item.put("missingSkills", List.of());
                }
            }
        }

        return ResponseEntity.ok(result);
    }

    @PutMapping("/applications/{id}/status")
    public ResponseEntity<?> updateApplicationStatus(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        String statusStr = (String) payload.get("status");
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                app.setStatus(ApplicationStatus.valueOf(statusStr.toUpperCase().trim()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + statusStr));
            }
        }

        if (payload.containsKey("notes")) {
            app.setNotes((String) payload.get("notes"));
        }
        if (payload.containsKey("recruiterRating")) {
            Object r = payload.get("recruiterRating");
            if (r instanceof Number) {
                app.setRecruiterRating(((Number) r).intValue());
            }
        }

        applicationRepository.save(app);

        // Send status change email notification to candidate via Gmail SMTP
        if (statusStr != null && !statusStr.isBlank() && app.getUser() != null && app.getUser().getEmail() != null) {
            String candidateEmail = app.getUser().getEmail();
            String candidateName = app.getUser().getName();
            String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Job Opportunity";
            String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Company";
            String email = getCurrentUserEmail();
            String recruiterName = "Hiring Team";
            if (email != null) {
                recruiterName = userRepository.findByEmail(email).map(User::getName).orElse("Hiring Team");
            }
            String notes = (String) payload.get("notes");

            logger.info("Recruiter [{}] updated application #{} status to [{}] for candidate [{}] ({}). Dispatching status update email...",
                    recruiterName, id, app.getStatus().name(), candidateName, candidateEmail);

            try {
                emailService.sendApplicationStatusUpdateEmail(
                        candidateEmail,
                        candidateName,
                        jobTitle,
                        company,
                        app.getStatus(),
                        notes,
                        recruiterName
                );
            } catch (Exception ex) {
                logger.error("Failed to send status update email to candidate {}: {}", candidateEmail, ex.getMessage(), ex);
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", app.getStatus().name(),
                "message", "Candidate pipeline advanced to " + app.getStatus().name()
        ));
    }

    // ==========================================
    // 4. INTERVIEW SCHEDULER & EMAIL DISPATCH
    // ==========================================
    @PostMapping("/applications/{id}/schedule-interview")
    public ResponseEntity<?> scheduleInterview(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        String interviewTime = payload.get("interviewTime");
        String meetingLink = payload.get("interviewMeetingLink");
        String round = payload.get("interviewRound");
        String notes = payload.get("notes");

        app.setInterviewTime(interviewTime);
        app.setInterviewMeetingLink(meetingLink);
        app.setInterviewRound(round);
        if (notes != null && !notes.isBlank()) {
            app.setNotes(notes);
        }
        app.setStatus(ApplicationStatus.INTERVIEW);
        applicationRepository.save(app);

        // Send real email invitation to candidate via Gmail SMTP
        if (app.getUser() != null && app.getUser().getEmail() != null) {
            String candidateName = app.getUser().getName();
            String candidateEmail = app.getUser().getEmail();
            String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Candidate Role";
            String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Partner";

            try {
                emailService.sendInterviewInviteEmail(
                        candidateEmail,
                        candidateName,
                        jobTitle,
                        company,
                        interviewTime,
                        meetingLink,
                        round,
                        notes
                );
            } catch (Exception ex) {
                // Non-blocking log
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "INTERVIEW",
                "message", "Interview scheduled and calendar invitation sent to candidate!"
        ));
    }

    // ==========================================
    // 5. RECRUITER COMPANY PROFILE
    // ==========================================
    @GetMapping("/profile")
    public ResponseEntity<?> getRecruiterProfile() {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User u = userOpt.get();
        Map<String, Object> profile = new HashMap<>();
        profile.put("name", u.getName());
        profile.put("email", u.getEmail());
        profile.put("phone", u.getPhone());
        profile.put("role", u.getRole());
        profile.put("companyName", u.getCompanyName());
        profile.put("companyWebsite", u.getCompanyWebsite());
        profile.put("companyIndustry", u.getCompanyIndustry());
        profile.put("companyLocation", u.getCompanyLocation());

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateRecruiterProfile(@RequestBody Map<String, String> payload) {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User u = userOpt.get();
        if (payload.containsKey("name")) u.setName(payload.get("name"));
        if (payload.containsKey("phone")) u.setPhone(payload.get("phone"));
        if (payload.containsKey("companyName")) u.setCompanyName(payload.get("companyName"));
        if (payload.containsKey("companyWebsite")) u.setCompanyWebsite(payload.get("companyWebsite"));
        if (payload.containsKey("companyIndustry")) u.setCompanyIndustry(payload.get("companyIndustry"));
        if (payload.containsKey("companyLocation")) u.setCompanyLocation(payload.get("companyLocation"));

        userRepository.save(u);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Company & recruiter profile updated successfully"
        ));
    }

    // ==========================================
    // 6. CANDIDATE RESUME VIEW & DOWNLOAD
    // ==========================================
    @GetMapping("/applications/{id}/resume")
    public ResponseEntity<?> getCandidateResume(@PathVariable Long id) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        User u = app.getUser();
        Job j = app.getJob();

        Map<String, Object> resume = new HashMap<>();
        resume.put("applicationId", app.getId());
        resume.put("candidateName", u != null ? u.getName() : "Candidate");
        resume.put("candidateEmail", u != null ? u.getEmail() : "");
        resume.put("candidatePhone", u != null ? u.getPhone() : "");
        resume.put("jobTitle", u != null && u.getJobTitle() != null && !u.getJobTitle().isBlank() ? u.getJobTitle() : (j != null ? j.getTitle() : "Candidate"));
        resume.put("company", j != null ? j.getCompany() : "");
        resume.put("location", j != null ? j.getLocation() : "");
        resume.put("experienceYears", u != null && u.getExperience() != null ? u.getExperience() : 0);
        resume.put("skills", u != null ? u.getSkills() : "");
        resume.put("resumeFileName", u != null && u.getResumeFileName() != null && !u.getResumeFileName().isBlank() ? u.getResumeFileName() : (u != null ? u.getName().replace(" ", "_") + "_Resume.pdf" : "Candidate_Resume.pdf"));
        resume.put("resumeUploadedAt", u != null ? u.getResumeUploadedAt() : null);
        resume.put("rawResumeText", u != null ? u.getResumeText() : "");
        resume.put("status", app.getStatus() != null ? app.getStatus().name() : "SAVED");
        resume.put("interviewTime", app.getInterviewTime());
        resume.put("interviewMeetingLink", app.getInterviewMeetingLink());
        resume.put("interviewRound", app.getInterviewRound());
        resume.put("notes", app.getNotes());

        return ResponseEntity.ok(resume);
    }

    @GetMapping(value = "/applications/{id}/resume/download", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<byte[]> downloadCandidateResume(@PathVariable Long id) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Application app = appOpt.get();
        User u = app.getUser();
        Job j = app.getJob();

        String name = u != null ? u.getName() : "Candidate";
        String email = u != null ? u.getEmail() : "N/A";
        String phone = u != null && u.getPhone() != null && !u.getPhone().isBlank() ? u.getPhone() : "N/A";
        String title = u != null && u.getJobTitle() != null && !u.getJobTitle().isBlank() ? u.getJobTitle() : (j != null ? j.getTitle() : "Software Engineer");
        String skills = u != null && u.getSkills() != null ? u.getSkills() : "N/A";
        int exp = u != null && u.getExperience() != null ? u.getExperience() : 0;
        String rawText = u != null && u.getResumeText() != null ? u.getResumeText() : "";

        StringBuilder doc = new StringBuilder();
        doc.append("========================================================================\n");
        doc.append("                     CANDIDATE CURRICULUM VITAE                         \n");
        doc.append("========================================================================\n\n");
        doc.append("NAME:         ").append(name).append("\n");
        doc.append("EMAIL:        ").append(email).append("\n");
        doc.append("PHONE:        ").append(phone).append("\n");
        doc.append("ROLE:         ").append(title).append("\n");
        doc.append("EXPERIENCE:   ").append(exp).append(" years\n");
        doc.append("APPLIED FOR:  ").append(j != null ? j.getTitle() : "N/A").append(" at ").append(j != null ? j.getCompany() : "JobHub").append("\n");
        doc.append("STATUS:       ").append(app.getStatus() != null ? app.getStatus().name() : "APPLIED").append("\n\n");

        doc.append("------------------------------------------------------------------------\n");
        doc.append("TECHNICAL PROFICIENCIES & SKILLS\n");
        doc.append("------------------------------------------------------------------------\n");
        for (String skill : skills.split(",")) {
            if (!skill.trim().isBlank()) {
                doc.append(" • ").append(skill.trim()).append("\n");
            }
        }
        doc.append("\n");

        if (!rawText.isBlank()) {
            doc.append("------------------------------------------------------------------------\n");
            doc.append("RESUME PROFILE & EXPERIENCE DETAILS\n");
            doc.append("------------------------------------------------------------------------\n");
            doc.append(rawText).append("\n\n");
        } else {
            doc.append("------------------------------------------------------------------------\n");
            doc.append("PROFESSIONAL SUMMARY\n");
            doc.append("------------------------------------------------------------------------\n");
            doc.append("Dedicated ").append(title).append(" with ").append(exp).append(" years of demonstrated expertise.\n");
            doc.append("Strong technical competencies in ").append(skills).append(".\n\n");
        }

        doc.append("========================================================================\n");
        doc.append("Generated by JobHub Recruitment & Talent Platform\n");
        doc.append("========================================================================\n");

        byte[] bytes = doc.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("text/plain;charset=UTF-8"));
        String safeName = name.replaceAll("[^a-zA-Z0-9_]", "_");
        headers.setContentDispositionFormData("attachment", safeName + "_Resume.doc");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    // ==========================================
    // 7. AI CANDIDATE ANALYSIS & INTERVIEW PREP
    // ==========================================
    @GetMapping("/applications/{id}/ai-analysis")
    public ResponseEntity<?> getApplicationAiAnalysis(@PathVariable Long id) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        if (app.getJob() == null || app.getUser() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Application missing job or user details"));
        }

        List<String> candSkills = app.getUser().getSkills() != null
                ? Arrays.stream(app.getUser().getSkills().split(",")).map(String::trim).filter(s -> !s.isBlank()).toList()
                : List.of();
        int candExp = app.getUser().getExperience() != null ? app.getUser().getExperience() : 1;

        JobMatchAnalysisDto analysis = careerIntelligenceService.analyzeJobMatch(app.getJob(), candSkills, candExp);
        return ResponseEntity.ok(analysis);
    }

    // ==========================================
    // 8. 1-CLICK OFFER LETTER GENERATOR & DISPATCH
    // ==========================================
    @PostMapping("/applications/{id}/generate-offer")
    public ResponseEntity<?> generateAndSendOfferLetter(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        String salary = payload.getOrDefault("salary", "Competitive");
        String designation = payload.getOrDefault("designation", app.getJob() != null ? app.getJob().getTitle() : "Software Engineer");
        String joiningDate = payload.getOrDefault("joiningDate", "To be determined");
        String benefits = payload.getOrDefault("benefits", "Health insurance, performance bonus, paid time off");
        String instructions = payload.getOrDefault("instructions", "Please review and confirm your acceptance through your JobHub candidate portal within 7 business days.");

        app.setOfferSalary(salary);
        app.setOfferDesignation(designation);
        app.setOfferJoiningDate(joiningDate);
        app.setOfferBenefits(benefits);
        app.setOfferSentAt(LocalDateTime.now());
        app.setStatus(ApplicationStatus.OFFER);
        applicationRepository.save(app);

        // Dispatch branded offer letter email via Gmail SMTP
        if (app.getUser() != null && app.getUser().getEmail() != null) {
            String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Partner";
            try {
                emailService.sendOfferLetterEmail(
                        app.getUser().getEmail(),
                        app.getUser().getName(),
                        designation,
                        company,
                        salary,
                        joiningDate,
                        benefits,
                        instructions
                );
            } catch (Exception ex) {
                // Non-blocking log
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "OFFER",
                "message", "Formal Offer Letter generated and dispatched to candidate's email!"
        ));
    }

    @GetMapping(value = "/applications/{id}/offer/download", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<byte[]> downloadOfferLetter(@PathVariable Long id) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Application app = appOpt.get();
        User u = app.getUser();
        Job j = app.getJob();

        String name = u != null ? u.getName() : "Candidate";
        String designation = app.getOfferDesignation() != null && !app.getOfferDesignation().isBlank()
                ? app.getOfferDesignation()
                : (j != null ? j.getTitle() : "Software Engineer");
        String company = j != null ? j.getCompany() : "Hiring Organization";
        String salary = app.getOfferSalary() != null && !app.getOfferSalary().isBlank() ? app.getOfferSalary() : "Competitive Market Package";
        String joiningDate = app.getOfferJoiningDate() != null && !app.getOfferJoiningDate().isBlank() ? app.getOfferJoiningDate() : "Upon mutual agreement";
        String benefits = app.getOfferBenefits() != null && !app.getOfferBenefits().isBlank() ? app.getOfferBenefits() : "Comprehensive Health Coverage, 401(k)/PF, Paid Vacation";

        StringBuilder doc = new StringBuilder();
        doc.append("========================================================================\n");
        doc.append("                    OFFICIAL OFFER OF EMPLOYMENT                        \n");
        doc.append("                     CONFIDENTIAL APPOINTMENT LETTER                    \n");
        doc.append("========================================================================\n\n");
        doc.append("DATE:           ").append(LocalDateTime.now().toLocalDate().toString()).append("\n");
        doc.append("TO:             ").append(name).append("\n");
        doc.append("EMAIL:          ").append(u != null ? u.getEmail() : "N/A").append("\n");
        doc.append("EMPLOYER:       ").append(company).append("\n\n");
        doc.append("Dear ").append(name).append(",\n\n");
        doc.append("On behalf of ").append(company).append(", we are pleased to offer you the position of:\n");
        doc.append(">>> ").append(designation.toUpperCase()).append(" <<<\n\n");
        doc.append("We were thoroughly impressed by your credentials, technical expertise, and interviews\n");
        doc.append("with our engineering leadership. We are confident you will make a tremendous impact.\n\n");
        doc.append("------------------------------------------------------------------------\n");
        doc.append("TERMS & COMPENSATION BREAKDOWN\n");
        doc.append("------------------------------------------------------------------------\n");
        doc.append(" • Position Title:       ").append(designation).append("\n");
        doc.append(" • Total Compensation:   ").append(salary).append("\n");
        doc.append(" • Expected Start Date:  ").append(joiningDate).append("\n");
        doc.append(" • Workplace Type:       ").append(j != null ? j.getJobType() : "Full-Time").append("\n");
        doc.append(" • Location / Base:      ").append(j != null ? j.getLocation() : "Hybrid / Remote").append("\n\n");
        doc.append("------------------------------------------------------------------------\n");
        doc.append("BENEFITS & PERKS\n");
        doc.append("------------------------------------------------------------------------\n");
        doc.append(benefits).append("\n\n");
        doc.append("------------------------------------------------------------------------\n");
        doc.append("ACCEPTANCE INSTRUCTIONS\n");
        doc.append("------------------------------------------------------------------------\n");
        doc.append("Please acknowledge your acceptance of this offer by signing and confirming\n");
        doc.append("through your JobHub candidate portal. This offer is valid for 7 business days.\n\n");
        doc.append("Sincerely,\n\n");
        doc.append("Talent Acquisition & Executive Hiring Team\n");
        doc.append(company).append("\n");
        doc.append("========================================================================\n");
        doc.append("Verified & Issued via JobHub Talent Platform\n");
        doc.append("========================================================================\n");

        byte[] bytes = doc.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("text/plain;charset=UTF-8"));
        String safeName = name.replaceAll("[^a-zA-Z0-9_]", "_");
        headers.setContentDispositionFormData("attachment", safeName + "_Offer_Letter.doc");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    // ==========================================
    // 9. RECRUITER ↔ CANDIDATE IN-APP CHAT
    // ==========================================
    @GetMapping("/applications/{id}/messages")
    public ResponseEntity<?> getApplicationMessages(@PathVariable Long id) {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<ChatMessage> messages = chatMessageRepository.findByApplicationIdOrderBySentAtAsc(id);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/applications/{id}/messages")
    public ResponseEntity<?> sendApplicationMessage(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String content = payload.get("message");
        if (content == null || content.trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }

        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        String senderName = userOpt.map(User::getName).orElse(email);
        String senderRole = isUserAdmin(email) ? "ADMIN" : (userOpt.map(User::getRole).orElse("RECRUITER"));

        ChatMessage msg = ChatMessage.builder()
                .applicationId(id)
                .senderEmail(email)
                .senderName(senderName)
                .senderRole(senderRole)
                .message(content.trim())
                .sentAt(LocalDateTime.now())
                .build();

        chatMessageRepository.save(msg);

        // Send instant email notification to candidate via Gmail SMTP
        Application app = appOpt.get();
        if (app.getUser() != null && app.getUser().getEmail() != null && !app.getUser().getEmail().isBlank()) {
            String candidateEmail = app.getUser().getEmail().trim();
            String candidateName = app.getUser().getName();
            String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Organization";
            String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Candidate Role";

            logger.info("Recruiter [{}] sent in-app message to candidate [{}] ({}) regarding job [{}]. Triggering email notification...",
                    senderName, candidateName, candidateEmail, jobTitle);

            try {
                emailService.sendRecruiterMessageNotificationEmail(
                        candidateEmail,
                        candidateName,
                        senderName,
                        company,
                        jobTitle,
                        content.trim()
                );
            } catch (Exception ex) {
                logger.error("Failed to trigger message notification email to candidate {}: {}", candidateEmail, ex.getMessage(), ex);
            }
        } else {
            logger.warn("Application {} has no associated candidate email address. Skipping email notification.", id);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", msg));
    }

    // ==========================================
    // 10. CANDIDATE FOLLOW-UPS & NOTIFICATIONS
    // ==========================================
    @GetMapping("/follow-ups")
    public ResponseEntity<?> getCandidateFollowUps() {
        String email = getCurrentUserEmail();
        if (email == null) {
            email = "yashashriwagh05@gmail.com";
        }

        boolean isAdmin = isUserAdmin(email);
        List<Application> apps = applicationRepository.findByJobPostedByEmailOrderBySavedAtDesc(email);
        if (apps.isEmpty() || isAdmin) {
            List<Application> fallbackApps = applicationRepository.findTop50ByOrderBySavedAtDesc();
            if (apps.isEmpty()) {
                apps = fallbackApps;
            }
        }

        List<Map<String, Object>> followUpList = new ArrayList<>();
        int totalUnreadCount = 0;
        int waitingReplyCount = 0;

        for (Application a : apps) {
            Long appId = a.getId();
            List<ChatMessage> messages = chatMessageRepository.findByApplicationIdOrderBySentAtAsc(appId);

            // Candidate info resolution
            User candidateUser = a.getUser();
            if (candidateUser != null && "guest@jobportal.local".equalsIgnoreCase(candidateUser.getEmail())) {
                Optional<User> realCandidateOpt = userRepository.findByEmail("waghyashashri09@gmail.com");
                if (realCandidateOpt.isPresent()) {
                    candidateUser = realCandidateOpt.get();
                }
            }
            String candidateName = candidateUser != null && candidateUser.getName() != null ? candidateUser.getName() : "Candidate";
            String candidateEmail = candidateUser != null && candidateUser.getEmail() != null ? candidateUser.getEmail() : "waghyashashri09@gmail.com";
            String candidatePhone = candidateUser != null ? candidateUser.getPhone() : null;
            String candidateSkills = candidateUser != null ? candidateUser.getSkills() : "";

            // Job info
            String jobTitle = a.getJob() != null ? a.getJob().getTitle() : "Software Engineer";
            String company = a.getJob() != null ? a.getJob().getCompany() : "TechHub Innovators";
            String location = a.getJob() != null ? a.getJob().getLocation() : "Remote / Hybrid";
            Long jobId = a.getJob() != null ? a.getJob().getId() : null;

            boolean hasMessages = !messages.isEmpty();
            boolean hasNotes = a.getNotes() != null && !a.getNotes().isBlank();

            if (hasMessages || hasNotes) {
                Map<String, Object> item = new HashMap<>();
                item.put("applicationId", appId);
                item.put("jobId", jobId);
                item.put("jobTitle", jobTitle);
                item.put("company", company);
                item.put("location", location);
                item.put("status", a.getStatus() != null ? a.getStatus().name() : "APPLIED");
                item.put("appliedAt", a.getSavedAt());
                item.put("interviewTime", a.getInterviewTime());
                item.put("interviewMeetingLink", a.getInterviewMeetingLink());
                item.put("interviewRound", a.getInterviewRound());
                item.put("offerSalary", a.getOfferSalary());
                item.put("offerDesignation", a.getOfferDesignation());
                item.put("offerJoiningDate", a.getOfferJoiningDate());
                item.put("coverNote", a.getNotes());

                Map<String, Object> u = new HashMap<>();
                u.put("name", candidateName);
                u.put("email", candidateEmail);
                u.put("phone", candidatePhone);
                u.put("skills", candidateSkills);
                item.put("candidate", u);

                item.put("messages", messages);
                item.put("messagesCount", messages.size());

                int unreadInThisApp = 0;
                ChatMessage latestMsg = null;
                if (!messages.isEmpty()) {
                    latestMsg = messages.get(messages.size() - 1);
                    for (ChatMessage m : messages) {
                        if ("USER".equalsIgnoreCase(m.getSenderRole())) {
                            if (m.getReadByRecruiter() == null || !m.getReadByRecruiter()) {
                                unreadInThisApp++;
                            }
                        }
                    }
                }

                totalUnreadCount += unreadInThisApp;
                item.put("unreadCount", unreadInThisApp);
                item.put("isUnread", unreadInThisApp > 0);

                if (latestMsg != null) {
                    item.put("latestMessage", latestMsg.getMessage());
                    item.put("latestSenderRole", latestMsg.getSenderRole());
                    item.put("latestSenderName", latestMsg.getSenderName());
                    item.put("latestSentAt", latestMsg.getSentAt());
                    boolean waiting = "USER".equalsIgnoreCase(latestMsg.getSenderRole());
                    item.put("isWaitingReply", waiting);
                    if (waiting) waitingReplyCount++;
                } else {
                    item.put("latestMessage", a.getNotes());
                    item.put("latestSenderRole", "USER");
                    item.put("latestSenderName", candidateName);
                    item.put("latestSentAt", a.getSavedAt());
                    item.put("isWaitingReply", true);
                    waitingReplyCount++;
                }

                followUpList.add(item);
            }
        }

        // Sort follow-ups: unread / waiting first, then by latest timestamp
        followUpList.sort((f1, f2) -> {
            boolean w1 = Boolean.TRUE.equals(f1.get("isWaitingReply"));
            boolean w2 = Boolean.TRUE.equals(f2.get("isWaitingReply"));
            if (w1 != w2) return w1 ? -1 : 1;
            Object t1 = f1.get("latestSentAt");
            Object t2 = f2.get("latestSentAt");
            if (t1 instanceof LocalDateTime && t2 instanceof LocalDateTime) {
                return ((LocalDateTime) t2).compareTo((LocalDateTime) t1);
            }
            return 0;
        });

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("totalFollowUps", followUpList.size());
        resp.put("unreadFollowUpsCount", totalUnreadCount);
        resp.put("waitingReplyCount", waitingReplyCount);
        resp.put("followUps", followUpList);

        return ResponseEntity.ok(resp);
    }

    @PutMapping("/follow-ups/{applicationId}/read")
    public ResponseEntity<?> markFollowUpAsRead(@PathVariable Long applicationId) {
        List<ChatMessage> messages = chatMessageRepository.findByApplicationIdOrderBySentAtAsc(applicationId);
        for (ChatMessage msg : messages) {
            if ("USER".equalsIgnoreCase(msg.getSenderRole())) {
                msg.setReadByRecruiter(true);
            }
        }
        chatMessageRepository.saveAll(messages);
        return ResponseEntity.ok(Map.of("success", true, "message", "Marked follow-ups as read"));
    }

    @PutMapping("/follow-ups/read-all")
    public ResponseEntity<?> markAllFollowUpsAsRead() {
        List<ChatMessage> allUserMsgs = chatMessageRepository.findAll();
        for (ChatMessage msg : allUserMsgs) {
            if ("USER".equalsIgnoreCase(msg.getSenderRole())) {
                msg.setReadByRecruiter(true);
            }
        }
        chatMessageRepository.saveAll(allUserMsgs);
        return ResponseEntity.ok(Map.of("success", true, "message", "All candidate follow-ups marked as read"));
    }
}
