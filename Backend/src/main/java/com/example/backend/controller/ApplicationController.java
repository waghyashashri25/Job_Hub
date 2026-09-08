package com.example.backend.controller;

import com.example.backend.model.Application;
import com.example.backend.model.ApplicationStatus;
import com.example.backend.model.ChatMessage;
import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.ApplicationRepository;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ApplicationService;
import com.example.backend.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationController.class);

    private final ApplicationService applicationService;
    private final ApplicationRepository applicationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public ApplicationController(ApplicationService applicationService,
                                 ApplicationRepository applicationRepository,
                                 ChatMessageRepository chatMessageRepository,
                                 UserRepository userRepository,
                                 EmailService emailService) {
        this.applicationService = applicationService;
        this.applicationRepository = applicationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @PostMapping("/save")
    public ResponseEntity<ApplicationResponse> saveJob(@RequestBody SaveApplicationRequest request) {
        Application saved = applicationService.saveJobForCurrentUser(request.getJobId());
        return ResponseEntity.ok(toResponse(saved));
    }

    @PostMapping("/apply")
    public ResponseEntity<ApplicationResponse> applyJob(@RequestBody ApplyJobRequest request) {
        Application applied = applicationService.applyJobForCurrentUser(
                request.getJobId(),
                request.getJob(),
                request.getNotes(),
                request.getCandidateEmail(),
                request.getCandidateName(),
                request.getCandidatePhone(),
                request.getCandidateSkills()
        );
        return ResponseEntity.ok(toResponse(applied));
    }

    @PutMapping("/update-status")
    public ResponseEntity<ApplicationResponse> updateStatus(@RequestBody UpdateApplicationStatusRequest request) {
        Application updated = applicationService.updateStatusForCurrentUser(request.getApplicationId(), request.getStatus());
        return ResponseEntity.ok(toResponse(updated));
    }

    @PutMapping("/update-notes")
    public ResponseEntity<ApplicationResponse> updateNotes(@RequestBody UpdateNotesRequest request) {
        Application updated = applicationService.updateNotesForCurrentUser(request.getApplicationId(), request.getNotes());
        return ResponseEntity.ok(toResponse(updated));
    }

    @GetMapping("/user")
    public ResponseEntity<List<ApplicationResponse>> currentUserApplications(@RequestParam(required = false) String email) {
        List<ApplicationResponse> responses = applicationService.getCurrentUserApplications(email)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long id) {
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<ChatMessage> messages = chatMessageRepository.findByApplicationIdOrderBySentAtAsc(id);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String email = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getName()
                : null;
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Application app = appOpt.get();
        String content = payload.get("message");
        if (content == null || content.trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }

        String senderEmail = payload.get("senderEmail");
        String senderName = payload.get("senderName");
        String senderRole = payload.get("senderRole");

        if (email != null && !email.isBlank() && !"anonymousUser".equalsIgnoreCase(email)) {
            Optional<User> uOpt = userRepository.findByEmail(email);
            if (uOpt.isPresent()) {
                senderEmail = email;
                senderName = uOpt.get().getName();
                senderRole = uOpt.get().getRole();
            }
        }

        if (senderEmail == null || senderEmail.isBlank() || "anonymousUser".equalsIgnoreCase(senderEmail)) {
            if (app.getUser() != null && app.getUser().getEmail() != null && !"guest@jobportal.local".equalsIgnoreCase(app.getUser().getEmail())) {
                senderEmail = app.getUser().getEmail();
                senderName = app.getUser().getName();
                senderRole = "USER";
            } else {
                senderEmail = "waghyashashri09@gmail.com";
                senderName = "Yashashri Wagh";
                senderRole = "USER";
            }
        }

        if (senderName == null || senderName.isBlank()) {
            senderName = "Yashashri Wagh";
        }
        if (senderRole == null || senderRole.isBlank()) {
            senderRole = "USER";
        }

        ChatMessage msg = ChatMessage.builder()
                .applicationId(id)
                .senderEmail(senderEmail)
                .senderName(senderName)
                .senderRole(senderRole)
                .message(content.trim())
                .sentAt(LocalDateTime.now())
                .build();

        chatMessageRepository.save(msg);

        // Send instant email notification to the other party
        try {
            boolean isRecruiterOrAdmin = "RECRUITER".equalsIgnoreCase(senderRole) || "ADMIN".equalsIgnoreCase(senderRole)
                    || (app.getJob() != null && app.getJob().getPostedByEmail() != null && senderEmail.equalsIgnoreCase(app.getJob().getPostedByEmail()));

            if (isRecruiterOrAdmin) {
                // Recruiter/Admin sent message to candidate -> email the candidate
                if (app.getUser() != null && app.getUser().getEmail() != null && !app.getUser().getEmail().isBlank()) {
                    String candidateEmail = app.getUser().getEmail().trim();
                    String candidateName = app.getUser().getName();
                    String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Partner";
                    String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Candidate Role";

                    logger.info("Recruiter/Admin [{}] sent message to candidate [{}] ({}). Dispatching email notification...",
                            senderName, candidateName, candidateEmail);

                    emailService.sendRecruiterMessageNotificationEmail(
                            candidateEmail,
                            candidateName,
                            senderName,
                            company,
                            jobTitle,
                            content.trim()
                    );
                }
            } else {
                // Candidate sent message to recruiter -> email the recruiter
                String recruiterEmail = app.getJob() != null ? app.getJob().getPostedByEmail() : null;
                if (recruiterEmail != null && !recruiterEmail.isBlank()) {
                    String company = app.getJob() != null ? app.getJob().getCompany() : "Hiring Organization";
                    String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Position";

                    logger.info("Candidate [{}] sent message to recruiter ({}). Dispatching email notification...",
                            senderName, recruiterEmail);

                    emailService.sendCandidateMessageNotificationEmail(
                            recruiterEmail.trim(),
                            "Hiring Team",
                            senderName,
                            company,
                            jobTitle,
                            content.trim()
                    );
                }
            }
        } catch (Exception ex) {
            logger.error("Failed to send message notification email: {}", ex.getMessage(), ex);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", msg));
    }

    @GetMapping(value = "/{id}/offer/download", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<byte[]> downloadOfferLetter(@PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Application> appOpt = applicationRepository.findById(id);
        if (appOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Application app = appOpt.get();
        if (app.getUser() == null || !app.getUser().getEmail().equalsIgnoreCase(email)) {
            Optional<User> uOpt = userRepository.findByEmail(email);
            if (uOpt.isEmpty() || (!"ADMIN".equalsIgnoreCase(uOpt.get().getRole()) && !"RECRUITER".equalsIgnoreCase(uOpt.get().getRole()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

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

    private ApplicationResponse toResponse(Application application) {
        long messageCount = chatMessageRepository != null ? chatMessageRepository.countByApplicationId(application.getId()) : 0;
        return new ApplicationResponse(
                application.getId(),
                application.getJob().getId(),
                application.getJob().getTitle(),
                application.getJob().getCompany(),
                application.getJob().getLocation(),
                application.getJob().getSource(),
                application.getJob().getApplyLink(),
                application.getStatus(),
                application.getNotes(),
                application.getSavedAt(),
                application.getOfferSalary(),
                application.getOfferDesignation(),
                application.getOfferJoiningDate(),
                application.getOfferBenefits(),
                application.getOfferSentAt(),
                messageCount,
                application.getInterviewTime(),
                application.getInterviewMeetingLink(),
                application.getInterviewRound(),
                application.getRecruiterRating()
        );
    }

    public static class SaveApplicationRequest {
        private Long jobId;

        public Long getJobId() {
            return jobId;
        }

        public void setJobId(Long jobId) {
            this.jobId = jobId;
        }
    }

    public static class ApplyJobRequest {
        private Long jobId;
        private Job job;
        private String notes;
        private String candidateEmail;
        private String candidateName;
        private String candidatePhone;
        private String candidateSkills;

        public Long getJobId() {
            return jobId;
        }

        public void setJobId(Long jobId) {
            this.jobId = jobId;
        }

        public Job getJob() {
            return job;
        }

        public void setJob(Job job) {
            this.job = job;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }

        public String getCandidateEmail() {
            return candidateEmail;
        }

        public void setCandidateEmail(String candidateEmail) {
            this.candidateEmail = candidateEmail;
        }

        public String getCandidateName() {
            return candidateName;
        }

        public void setCandidateName(String candidateName) {
            this.candidateName = candidateName;
        }

        public String getCandidatePhone() {
            return candidatePhone;
        }

        public void setCandidatePhone(String candidatePhone) {
            this.candidatePhone = candidatePhone;
        }

        public String getCandidateSkills() {
            return candidateSkills;
        }

        public void setCandidateSkills(String candidateSkills) {
            this.candidateSkills = candidateSkills;
        }
    }

    public static class UpdateApplicationStatusRequest {
        private Long applicationId;
        private ApplicationStatus status;

        public Long getApplicationId() {
            return applicationId;
        }

        public void setApplicationId(Long applicationId) {
            this.applicationId = applicationId;
        }

        public ApplicationStatus getStatus() {
            return status;
        }

        public void setStatus(ApplicationStatus status) {
            this.status = status;
        }
    }

    public static class UpdateNotesRequest {
        private Long applicationId;
        private String notes;

        public Long getApplicationId() {
            return applicationId;
        }

        public void setApplicationId(Long applicationId) {
            this.applicationId = applicationId;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }

    public static class ApplicationResponse {
        private final Long id;
        private final Long jobId;
        private final String jobTitle;
        private final String company;
        private final String location;
        private final String source;
        private final String applyLink;
        private final ApplicationStatus status;
        private final String notes;
        private final LocalDateTime savedAt;
        private final String offerSalary;
        private final String offerDesignation;
        private final String offerJoiningDate;
        private final String offerBenefits;
        private final LocalDateTime offerSentAt;
        private final long messageCount;
        private final String interviewTime;
        private final String interviewMeetingLink;
        private final String interviewRound;
        private final Integer recruiterRating;

        public ApplicationResponse(Long id,
                                   Long jobId,
                                   String jobTitle,
                                   String company,
                                   String location,
                                   String source,
                                   String applyLink,
                                   ApplicationStatus status,
                                   String notes,
                                   LocalDateTime savedAt,
                                   String offerSalary,
                                   String offerDesignation,
                                   String offerJoiningDate,
                                   String offerBenefits,
                                   LocalDateTime offerSentAt,
                                   long messageCount,
                                   String interviewTime,
                                   String interviewMeetingLink,
                                   String interviewRound,
                                   Integer recruiterRating) {
            this.id = id;
            this.jobId = jobId;
            this.jobTitle = jobTitle;
            this.company = company;
            this.location = location;
            this.source = source;
            this.applyLink = applyLink;
            this.status = status;
            this.notes = notes;
            this.savedAt = savedAt;
            this.offerSalary = offerSalary;
            this.offerDesignation = offerDesignation;
            this.offerJoiningDate = offerJoiningDate;
            this.offerBenefits = offerBenefits;
            this.offerSentAt = offerSentAt;
            this.messageCount = messageCount;
            this.interviewTime = interviewTime;
            this.interviewMeetingLink = interviewMeetingLink;
            this.interviewRound = interviewRound;
            this.recruiterRating = recruiterRating;
        }

        public long getMessageCount() {
            return messageCount;
        }

        public Long getId() {
            return id;
        }

        public Long getJobId() {
            return jobId;
        }

        public String getJobTitle() {
            return jobTitle;
        }

        public String getCompany() {
            return company;
        }

        public String getLocation() {
            return location;
        }

        public String getSource() {
            return source;
        }

        public String getApplyLink() {
            return applyLink;
        }

        public ApplicationStatus getStatus() {
            return status;
        }

        public String getNotes() {
            return notes;
        }

        public LocalDateTime getSavedAt() {
            return savedAt;
        }

        public String getOfferSalary() {
            return offerSalary;
        }

        public String getOfferDesignation() {
            return offerDesignation;
        }

        public String getOfferJoiningDate() {
            return offerJoiningDate;
        }

        public String getOfferBenefits() {
            return offerBenefits;
        }

        public LocalDateTime getOfferSentAt() {
            return offerSentAt;
        }

        public String getInterviewTime() {
            return interviewTime;
        }

        public String getInterviewMeetingLink() {
            return interviewMeetingLink;
        }

        public String getInterviewRound() {
            return interviewRound;
        }

        public Integer getRecruiterRating() {
            return recruiterRating;
        }
    }
}
