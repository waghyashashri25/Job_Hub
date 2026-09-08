package com.example.backend.controller;

import com.example.backend.connector.ConnectorCircuitBreaker;
import com.example.backend.model.Application;
import com.example.backend.model.ApplicationStatus;
import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.ApplicationRepository;
import com.example.backend.repository.JobRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.EmailService;
import com.example.backend.service.JobScheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final ConnectorCircuitBreaker circuitBreaker;
    private final Optional<JobScheduler> jobSchedulerOpt;
    private final EmailService emailService;

    // In-memory site-wide announcement state
    private static volatile String activeAnnouncement = "🚀 Real-time AI Job Search active: Matching across 10+ tech boards!";

    public AdminController(UserRepository userRepository,
                           JobRepository jobRepository,
                           ApplicationRepository applicationRepository,
                           ConnectorCircuitBreaker circuitBreaker,
                           Optional<JobScheduler> jobSchedulerOpt,
                           EmailService emailService) {
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.circuitBreaker = circuitBreaker;
        this.jobSchedulerOpt = jobSchedulerOpt;
        this.emailService = emailService;
    }

    // ==========================================
    // 1. KPI STATS & ANALYTICS
    // ==========================================
    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        long totalUsers = userRepository.count();
        long totalJobs = jobRepository.count();
        long totalApplications = applicationRepository.count();
        long adminCount = userRepository.countByRole("ADMIN");
        long userCount = userRepository.countByRole("USER");

        long googleUsers = userRepository.countByProviderIgnoreCase("GOOGLE");
        long githubUsers = userRepository.countByProviderIgnoreCase("GITHUB");
        long localUsers = userRepository.countByProviderIgnoreCase("LOCAL");

        Map<String, Long> providerStats = new LinkedHashMap<>();
        providerStats.put("LOCAL", localUsers);
        providerStats.put("GOOGLE", googleUsers);
        providerStats.put("GITHUB", githubUsers);

        List<Object[]> sourceCounts = jobRepository.countJobsBySource();
        List<Map<String, Object>> platformStats = new ArrayList<>();
        if (sourceCounts != null) {
            for (Object[] row : sourceCounts) {
                if (row != null && row.length >= 2 && row[0] != null) {
                    Map<String, Object> p = new HashMap<>();
                    p.put("platform", String.valueOf(row[0]));
                    p.put("count", ((Number) row[1]).longValue());
                    platformStats.add(p);
                }
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalUsers", totalUsers);
        response.put("totalJobs", totalJobs);
        response.put("totalApplications", totalApplications);
        response.put("adminCount", adminCount);
        response.put("userCount", userCount);
        response.put("providerStats", providerStats);
        response.put("platformStats", platformStats);

        return ResponseEntity.ok(response);
    }

    // ==========================================
    // 2. USER MANAGEMENT DIRECTORY
    // ==========================================
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAllByOrderByIdDesc();
        List<Map<String, Object>> sanitized = users.stream()
                .map(this::sanitizeUser)
                .collect(Collectors.toList());
        return ResponseEntity.ok(sanitized);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newRole = payload.get("role");
        if (newRole == null || (!newRole.equalsIgnoreCase("ADMIN") && !newRole.equalsIgnoreCase("USER"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role. Allowed values: ADMIN, USER"));
        }

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        user.setRole(newRole.toUpperCase().trim());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Role updated successfully to " + user.getRole(),
                "user", sanitizeUser(user)
        ));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        User targetUser = userOpt.get();
        String currentAdminEmail = getCurrentAuthenticatedEmail();

        if (currentAdminEmail != null && currentAdminEmail.equalsIgnoreCase(targetUser.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Security protection: You cannot delete your own administrative account."));
        }

        userRepository.delete(targetUser);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User '" + targetUser.getName() + "' (" + targetUser.getEmail() + ") deleted successfully."
        ));
    }

    // ==========================================
    // 3. APPLICATION PIPELINE & MONITOR
    // ==========================================
    @GetMapping("/applications")
    public ResponseEntity<?> getRecentApplications() {
        List<Application> apps = applicationRepository.findTop50ByOrderBySavedAtDesc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Application app : apps) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", app.getId());
            item.put("status", app.getStatus() != null ? app.getStatus().name() : "SAVED");
            item.put("savedAt", app.getSavedAt());
            item.put("notes", app.getNotes());

            if (app.getUser() != null) {
                Map<String, Object> u = new HashMap<>();
                u.put("id", app.getUser().getId());
                u.put("name", app.getUser().getName());
                u.put("email", app.getUser().getEmail());
                u.put("phone", app.getUser().getPhone());
                u.put("skills", app.getUser().getSkills());
                u.put("jobTitle", app.getUser().getJobTitle());
                u.put("experience", app.getUser().getExperience());
                item.put("user", u);
            }

            if (app.getJob() != null) {
                Map<String, Object> j = new HashMap<>();
                j.put("id", app.getJob().getId());
                j.put("title", app.getJob().getTitle());
                j.put("company", app.getJob().getCompany());
                j.put("location", app.getJob().getLocation());
                j.put("source", app.getJob().getSource());
                j.put("applyLink", app.getJob().getApplyLink());
                item.put("job", j);
            }

            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    @PutMapping("/applications/{id}/status")
    public ResponseEntity<?> updateApplicationStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String statusStr = payload.get("status");
        String notes = payload.get("notes");

        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        Application app = appOpt.get();
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                app.setStatus(ApplicationStatus.valueOf(statusStr.toUpperCase().trim()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + statusStr));
            }
        }

        if (notes != null) {
            app.setNotes(notes);
        }

        applicationRepository.save(app);

        // Send status change email notification to candidate via Gmail SMTP
        if (statusStr != null && !statusStr.isBlank() && app.getUser() != null && app.getUser().getEmail() != null) {
            String candidateEmail = app.getUser().getEmail();
            String candidateName = app.getUser().getName();
            String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Job Opportunity";
            String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Company";
            String adminName = "Platform Administrator";

            logger.info("Admin updated application #{} status to [{}] for candidate [{}] ({}). Dispatching status update email...",
                    id, app.getStatus().name(), candidateName, candidateEmail);

            try {
                emailService.sendApplicationStatusUpdateEmail(
                        candidateEmail,
                        candidateName,
                        jobTitle,
                        company,
                        app.getStatus(),
                        notes,
                        adminName
                );
            } catch (Exception ex) {
                logger.error("Failed to send status update email from AdminController: {}", ex.getMessage(), ex);
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Application status updated to " + app.getStatus(),
                "status", app.getStatus().name()
        ));
    }

    // ==========================================
    // 4. CONNECTOR & CIRCUIT BREAKER HEALTH
    // ==========================================
    @GetMapping("/health/connectors")
    public ResponseEntity<?> getConnectorHealth() {
        Map<String, Map<String, Object>> circuits = circuitBreaker.getAllCircuits();

        // Include default known external connectors if not yet registered in memory
        List<String> knownConnectors = List.of(
                "ADZUNA", "ARBEITNOW", "JOBICY", "JSEARCH", "REMOTIVE", "HIMALAYAS", "REMOTEOK", "DATABASE"
        );

        List<Map<String, Object>> connectorList = new ArrayList<>();
        for (String id : knownConnectors) {
            Map<String, Object> data = circuits.getOrDefault(id, Map.of(
                    "connectorId", id,
                    "state", "CLOSED",
                    "failures", 0,
                    "lastFailureTime", 0L
            ));
            connectorList.add(data);
        }

        return ResponseEntity.ok(Map.of(
                "connectors", connectorList,
                "totalMonitored", knownConnectors.size()
        ));
    }

    @PostMapping("/health/connectors/reset")
    public ResponseEntity<?> resetAllCircuitBreakers() {
        circuitBreaker.resetAll();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All external connector circuit breakers have been reset to CLOSED."
        ));
    }

    @PostMapping("/health/connectors/{id}/reset")
    public ResponseEntity<?> resetSpecificCircuitBreaker(@PathVariable String id) {
        circuitBreaker.reset(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Circuit breaker for '" + id + "' reset to CLOSED."
        ));
    }

    // ==========================================
    // 5. BACKGROUND SCHEDULER CONTROLS
    // ==========================================
    @GetMapping("/scheduler")
    public ResponseEntity<?> getSchedulerStatus() {
        if (jobSchedulerOpt.isPresent()) {
            return ResponseEntity.ok(jobSchedulerOpt.get().getSchedulerStatus());
        }
        return ResponseEntity.ok(Map.of(
                "enabled", false,
                "message", "Scheduler disabled by application properties."
        ));
    }

    @PostMapping("/scheduler/toggle")
    public ResponseEntity<?> toggleScheduler() {
        if (jobSchedulerOpt.isPresent()) {
            JobScheduler scheduler = jobSchedulerOpt.get();
            boolean newPausedState = !scheduler.isPaused();
            scheduler.setPaused(newPausedState);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "paused", newPausedState,
                    "message", newPausedState ? "Job scheduler paused by administrator." : "Job scheduler resumed successfully."
            ));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Scheduler not active in this profile"));
    }

    // ==========================================
    // 6. CSV DATA EXPORTS
    // ==========================================
    @GetMapping(value = "/export/users", produces = "text/csv")
    public ResponseEntity<byte[]> exportUsersCsv() {
        List<User> users = userRepository.findAllByOrderByIdDesc();
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Name,Email,Role,Provider,Phone,CountryCode,EmailVerified,PhoneVerified,Skills,JobTitle,Experience\n");

        for (User u : users) {
            csv.append(escapeCsv(String.valueOf(u.getId()))).append(",")
               .append(escapeCsv(u.getName())).append(",")
               .append(escapeCsv(u.getEmail())).append(",")
               .append(escapeCsv(u.getRole())).append(",")
               .append(escapeCsv(u.getProvider())).append(",")
               .append(escapeCsv(u.getPhone())).append(",")
               .append(escapeCsv(u.getCountryCode())).append(",")
               .append(Boolean.TRUE.equals(u.getEmailVerified())).append(",")
               .append(Boolean.TRUE.equals(u.getPhoneVerified())).append(",")
               .append(escapeCsv(u.getSkills())).append(",")
               .append(escapeCsv(u.getJobTitle())).append(",")
               .append(u.getExperience() != null ? u.getExperience() : 0).append("\n");
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "jobhub_candidates_" + System.currentTimeMillis() + ".csv");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    @GetMapping(value = "/export/applications", produces = "text/csv")
    public ResponseEntity<byte[]> exportApplicationsCsv() {
        List<Application> apps = applicationRepository.findTop50ByOrderBySavedAtDesc();
        StringBuilder csv = new StringBuilder();
        csv.append("ApplicationID,CandidateName,CandidateEmail,CandidatePhone,JobTitle,Company,Location,Source,Status,SavedAt,Notes\n");

        for (Application a : apps) {
            String cName = a.getUser() != null ? a.getUser().getName() : "";
            String cEmail = a.getUser() != null ? a.getUser().getEmail() : "";
            String cPhone = a.getUser() != null ? a.getUser().getPhone() : "";
            String jTitle = a.getJob() != null ? a.getJob().getTitle() : "";
            String jCompany = a.getJob() != null ? a.getJob().getCompany() : "";
            String jLoc = a.getJob() != null ? a.getJob().getLocation() : "";
            String jSource = a.getJob() != null ? a.getJob().getSource() : "";

            csv.append(escapeCsv(String.valueOf(a.getId()))).append(",")
               .append(escapeCsv(cName)).append(",")
               .append(escapeCsv(cEmail)).append(",")
               .append(escapeCsv(cPhone)).append(",")
               .append(escapeCsv(jTitle)).append(",")
               .append(escapeCsv(jCompany)).append(",")
               .append(escapeCsv(jLoc)).append(",")
               .append(escapeCsv(jSource)).append(",")
               .append(escapeCsv(a.getStatus() != null ? a.getStatus().name() : "SAVED")).append(",")
               .append(escapeCsv(a.getSavedAt() != null ? a.getSavedAt().toString() : "")).append(",")
               .append(escapeCsv(a.getNotes())).append("\n");
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "jobhub_applications_" + System.currentTimeMillis() + ".csv");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    // ==========================================
    // 7. SITE-WIDE ANNOUNCEMENT BANNER
    // ==========================================
    @GetMapping("/announcement")
    public ResponseEntity<?> getAnnouncement() {
        return ResponseEntity.ok(Map.of("announcement", activeAnnouncement));
    }

    @PostMapping("/announcement")
    public ResponseEntity<?> setAnnouncement(@RequestBody Map<String, String> payload) {
        String newAnnouncement = payload.get("announcement");
        activeAnnouncement = (newAnnouncement != null && !newAnnouncement.isBlank())
                ? newAnnouncement.trim()
                : "";
        return ResponseEntity.ok(Map.of(
                "success", true,
                "announcement", activeAnnouncement,
                "message", "Platform announcement banner updated successfully."
        ));
    }

    // ==========================================
    // 8. JOB INVENTORY & MANAGEMENT
    // ==========================================
    @GetMapping("/jobs")
    public ResponseEntity<?> getRecentJobs() {
        List<Job> jobs = jobRepository.findTop50ByOrderByIdDesc();
        return ResponseEntity.ok(jobs);
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<?> deleteJob(@PathVariable Long id) {
        if (!jobRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Job not found"));
        }
        jobRepository.deleteById(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Job #" + id + " removed successfully from the platform."
        ));
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================
    private Map<String, Object> sanitizeUser(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("role", u.getRole() != null ? u.getRole() : "USER");
        m.put("provider", u.getProvider() != null ? u.getProvider() : "LOCAL");
        m.put("phone", u.getPhone() != null ? u.getPhone() : "");
        m.put("countryCode", u.getCountryCode() != null ? u.getCountryCode() : "+91");
        m.put("emailVerified", Boolean.TRUE.equals(u.getEmailVerified()));
        m.put("phoneVerified", Boolean.TRUE.equals(u.getPhoneVerified()));
        m.put("jobAlertsEnabled", Boolean.TRUE.equals(u.getJobAlertsEnabled()));
        m.put("skills", u.getSkills() != null ? u.getSkills() : "");
        m.put("jobTitle", u.getJobTitle() != null ? u.getJobTitle() : "");
        m.put("experience", u.getExperience() != null ? u.getExperience() : 0);
        return m;
    }

    private String getCurrentAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return null;
    }

    private String escapeCsv(String val) {
        if (val == null) return "\"\"";
        return "\"" + val.replace("\"", "\"\"").replace("\n", " ").replace("\r", "") + "\"";
    }
}
