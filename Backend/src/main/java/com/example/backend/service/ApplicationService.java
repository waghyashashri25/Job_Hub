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

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;

    public ApplicationService(ApplicationRepository applicationRepository,
                              UserRepository userRepository,
                              JobRepository jobRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
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

    public List<Application> getCurrentUserApplications() {
        User currentUser = getCurrentUser();
        return applicationRepository.findByUserIdOrderBySavedAtDesc(currentUser.getId());
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
                        guest.setRole("ROLE_USER"); // Give USER role
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
