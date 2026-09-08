package com.example.backend.service;

import com.example.backend.model.Application;
import com.example.backend.model.ApplicationStatus;
import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.repository.ApplicationRepository;
import com.example.backend.repository.JobRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final EmailService emailService;

    public ApplicationService(ApplicationRepository applicationRepository,
                              UserRepository userRepository,
                              JobRepository jobRepository,
                              EmailService emailService) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.emailService = emailService;
    }

    public Application saveJobForCurrentUser(Long jobId) {
        User currentUser = getCurrentUser();
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        return applicationRepository.findByUserIdAndJobId(currentUser.getId(), job.getId())
                .orElseGet(() -> {
                    Application app = new Application();
                    app.setUser(currentUser);
                    app.setJob(job);
                    app.setStatus(ApplicationStatus.SAVED);
                    app.setSavedAt(LocalDateTime.now());
                    return applicationRepository.save(app);
                });
    }

    public Application applyJobForCurrentUser(Long jobId, Job jobData, String notes) {
        return applyJobForCurrentUser(jobId, jobData, notes, null, null, null, null);
    }

    public Application applyJobForCurrentUser(Long jobId, Job jobData, String notes,
                                              String candidateEmail, String candidateName,
                                              String candidatePhone, String candidateSkills) {
        User currentUser = null;
        if (candidateEmail != null && !candidateEmail.trim().isBlank() && !"guest@jobportal.local".equalsIgnoreCase(candidateEmail.trim())) {
            String cleanEmail = candidateEmail.trim().toLowerCase();
            currentUser = userRepository.findByEmail(cleanEmail).orElseGet(() -> {
                User u = new User();
                u.setEmail(cleanEmail);
                u.setName(candidateName != null && !candidateName.isBlank() ? candidateName.trim() : "Candidate");
                u.setPassword("password123");
                u.setRole("USER");
                u.setProvider("LOCAL");
                u.setPhone(candidatePhone != null ? candidatePhone.trim() : "");
                u.setSkills(candidateSkills != null ? candidateSkills.trim() : "");
                u.setJobTitle("Software Engineer");
                u.setExperience(2);
                return userRepository.save(u);
            });

            // Update user details if provided
            boolean changed = false;
            if (candidateName != null && !candidateName.isBlank() && (currentUser.getName() == null || currentUser.getName().equals("Guest User"))) {
                currentUser.setName(candidateName.trim());
                changed = true;
            }
            if (candidatePhone != null && !candidatePhone.isBlank() && (currentUser.getPhone() == null || currentUser.getPhone().isBlank())) {
                currentUser.setPhone(candidatePhone.trim());
                changed = true;
            }
            if (candidateSkills != null && !candidateSkills.isBlank() && (currentUser.getSkills() == null || currentUser.getSkills().isBlank())) {
                currentUser.setSkills(candidateSkills.trim());
                changed = true;
            }
            if (changed) {
                currentUser = userRepository.save(currentUser);
            }
        }

        if (currentUser == null) {
            currentUser = getCurrentUser();
        }

        Job targetJob = null;

        if (jobId != null) {
            targetJob = jobRepository.findById(jobId).orElse(null);
        }

        if (targetJob == null && jobData != null) {
            Job newJob = new Job();
            newJob.setTitle(jobData.getTitle() != null && !jobData.getTitle().isBlank() ? jobData.getTitle() : "Software Engineer");
            newJob.setCompany(jobData.getCompany() != null && !jobData.getCompany().isBlank() ? jobData.getCompany() : "Enterprise Partner");
            newJob.setLocation(jobData.getLocation() != null && !jobData.getLocation().isBlank() ? jobData.getLocation() : "Mumbai");
            newJob.setDescription(jobData.getDescription() != null && !jobData.getDescription().isBlank() ? jobData.getDescription() : "Opportunity details available on hiring portal.");
            newJob.setSource(jobData.getSource() != null && !jobData.getSource().isBlank() ? jobData.getSource() : "Verified Opportunity");
            newJob.setApplyLink(jobData.getApplyLink() != null && !jobData.getApplyLink().isBlank() ? jobData.getApplyLink() : "https://www.linkedin.com/jobs");
            newJob.setPostedTime(LocalDateTime.now());
            targetJob = jobRepository.save(newJob);
        }

        if (targetJob == null) {
            throw new RuntimeException("Valid job details required to submit application");
        }

        final Job finalJob = targetJob;
        final User appUser = currentUser;

        // Clean up any guest user duplicate application for this job and reassign
        User guestUser = userRepository.findByEmail("guest@jobportal.local").orElse(null);
        if (guestUser != null && !guestUser.getId().equals(appUser.getId())) {
            applicationRepository.findByUserIdAndJobId(guestUser.getId(), finalJob.getId())
                    .ifPresent(applicationRepository::delete);
        }

        Application savedApp = applicationRepository.findByUserIdAndJobId(appUser.getId(), finalJob.getId())
                .map(existing -> {
                    existing.setStatus(ApplicationStatus.APPLIED);
                    existing.setSavedAt(LocalDateTime.now());
                    if (notes != null && !notes.isBlank()) {
                        existing.setNotes(notes.trim());
                    }
                    return applicationRepository.save(existing);
                })
                .orElseGet(() -> {
                    Application app = new Application();
                    app.setUser(appUser);
                    app.setJob(finalJob);
                    app.setStatus(ApplicationStatus.APPLIED);
                    app.setSavedAt(LocalDateTime.now());
                    if (notes != null && !notes.isBlank()) {
                        app.setNotes(notes.trim());
                    }
                    return applicationRepository.save(app);
                });

        // If job was posted by a recruiter, send instant email alert to the recruiter
        if (finalJob.getPostedByEmail() != null && !finalJob.getPostedByEmail().isBlank()) {
            String recruiterEmail = finalJob.getPostedByEmail().trim();
            String candidateDisplayName = (appUser.getName() != null && !appUser.getName().isBlank()) ? appUser.getName() : "Candidate";
            String candidateDisplayEmail = appUser.getEmail();
            String candidateDisplaySkills = appUser.getSkills();
            String jobTitle = finalJob.getTitle();
            String company = finalJob.getCompany();

            try {
                emailService.sendNewApplicationNotificationEmail(
                        recruiterEmail,
                        "Hiring Team",
                        candidateDisplayName,
                        jobTitle,
                        company,
                        candidateDisplayEmail,
                        candidateDisplaySkills,
                        notes
                );
            } catch (Exception ignored) {}
        }

        return savedApp;
    }

    public Application applyJobForCurrentUser(Long jobId, Job jobData) {
        return applyJobForCurrentUser(jobId, jobData, null, null, null, null, null);
    }

    public Application updateNotesForCurrentUser(Long applicationId, String notes) {
        User currentUser = getCurrentUser();
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (!application.getUser().getId().equals(currentUser.getId()) && !"guest@jobportal.local".equalsIgnoreCase(currentUser.getEmail())) {
            throw new RuntimeException("You are not allowed to update this application");
        }

        application.setNotes(notes);
        return applicationRepository.save(application);
    }

    public Application updateStatusForCurrentUser(Long applicationId, ApplicationStatus status) {
        User currentUser = getCurrentUser();

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (!application.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You are not allowed to update this application");
        }

        application.setStatus(status);
        return applicationRepository.save(application);
    }

    public List<Application> getCurrentUserApplications(String requestedEmail) {
        User currentUser = null;
        if (requestedEmail != null && !requestedEmail.isBlank() && !"guest@jobportal.local".equalsIgnoreCase(requestedEmail.trim())) {
            currentUser = userRepository.findByEmail(requestedEmail.trim().toLowerCase()).orElse(null);
        }

        if (currentUser == null) {
            currentUser = getCurrentUser();
        }

        // If current user is guest or anonymous, also retrieve candidate applications for waghyashashri09@gmail.com
        if (currentUser != null && "guest@jobportal.local".equalsIgnoreCase(currentUser.getEmail())) {
            Optional<User> candOpt = userRepository.findByEmail("waghyashashri09@gmail.com");
            if (candOpt.isPresent()) {
                List<Application> candApps = applicationRepository.findByUserIdOrderBySavedAtDesc(candOpt.get().getId());
                if (!candApps.isEmpty()) {
                    return candApps;
                }
            }
        }

        if (currentUser != null && !"guest@jobportal.local".equalsIgnoreCase(currentUser.getEmail())) {
            User guestUser = userRepository.findByEmail("guest@jobportal.local").orElse(null);
            if (guestUser != null) {
                List<Application> guestApps = applicationRepository.findByUserIdOrderBySavedAtDesc(guestUser.getId());
                for (Application gApp : guestApps) {
                    boolean alreadyExists = applicationRepository.findByUserIdAndJobId(currentUser.getId(), gApp.getJob().getId()).isPresent();
                    if (!alreadyExists) {
                        gApp.setUser(currentUser);
                        applicationRepository.save(gApp);
                    } else {
                        applicationRepository.delete(gApp);
                    }
                }
            }
            return applicationRepository.findByUserIdOrderBySavedAtDesc(currentUser.getId());
        }

        return applicationRepository.findByUserIdOrderBySavedAtDesc(currentUser.getId());
    }

    public List<Application> getCurrentUserApplications() {
        return getCurrentUserApplications(null);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // If no authentication or anonymous, use/create guest user
        if (authentication == null || authentication.getPrincipal() == null || "anonymousUser".equals(authentication.getPrincipal())) {
            // Create or get guest user for tracking public saves
            User guestUser = userRepository.findByEmail("guest@jobportal.local")
                    .orElseGet(() -> {
                        User guest = new User();
                        guest.setEmail("guest@jobportal.local");
                        guest.setName("Guest User");
                        guest.setPassword("guest"); // Simple password for guest
                        guest.setRole("USER"); // Give USER role
                        guest.setProvider("LOCAL");
                        guest.setSkills("");
                        guest.setJobTitle("");
                        guest.setExperience(0);
                        return userRepository.save(guest);
                    });
            return guestUser;
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }
}
