package com.example.backend.controller;

import com.example.backend.model.Application;
import com.example.backend.model.ApplicationStatus;
import com.example.backend.service.ApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping("/save")
    public ResponseEntity<ApplicationResponse> saveJob(@RequestBody SaveApplicationRequest request) {
        Application saved = applicationService.saveJobForCurrentUser(request.getJobId());
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/update-status")
    public ResponseEntity<ApplicationResponse> updateStatus(@RequestBody UpdateApplicationStatusRequest request) {
        Application updated = applicationService.updateStatusForCurrentUser(request.getApplicationId(), request.getStatus());
        return ResponseEntity.ok(toResponse(updated));
    }

    @GetMapping("/user")
    public ResponseEntity<List<ApplicationResponse>> currentUserApplications() {
        List<ApplicationResponse> responses = applicationService.getCurrentUserApplications()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    private ApplicationResponse toResponse(Application application) {
        return new ApplicationResponse(
                application.getId(),
                application.getJob().getId(),
                application.getJob().getTitle(),
                application.getJob().getCompany(),
                application.getJob().getLocation(),
                application.getJob().getSource(),
                application.getJob().getApplyLink(),
                application.getStatus(),
                application.getSavedAt()
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

    public static class ApplicationResponse {
        private final Long id;
        private final Long jobId;
        private final String jobTitle;
        private final String company;
        private final String location;
        private final String source;
        private final String applyLink;
        private final ApplicationStatus status;
        private final LocalDateTime savedAt;

        public ApplicationResponse(Long id,
                                   Long jobId,
                                   String jobTitle,
                                   String company,
                                   String location,
                                   String source,
                                   String applyLink,
                                   ApplicationStatus status,
                                   LocalDateTime savedAt) {
            this.id = id;
            this.jobId = jobId;
            this.jobTitle = jobTitle;
            this.company = company;
            this.location = location;
            this.source = source;
            this.applyLink = applyLink;
            this.status = status;
            this.savedAt = savedAt;
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

        public LocalDateTime getSavedAt() {
            return savedAt;
        }
    }
}
