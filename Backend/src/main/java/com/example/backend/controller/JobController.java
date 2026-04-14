package com.example.backend.controller;

import com.example.backend.model.Job;
import com.example.backend.model.Platform;
import com.example.backend.service.JobService;
import com.example.backend.service.PlatformLinkGenerator;
import com.example.backend.dto.JobsResponseDto;
import com.example.backend.dto.JobsResponseDto.PlatformInfoDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;
    private final PlatformLinkGenerator platformLinkGenerator;

    public JobController(JobService jobService, PlatformLinkGenerator platformLinkGenerator) {
        this.jobService = jobService;
        this.platformLinkGenerator = platformLinkGenerator;
    }

    /**
     * Get all jobs with pagination support
     * @param pageable pagination parameters (page, size, sort)
     * @return paginated list of all jobs
     */
    @GetMapping("/all")
    public ResponseEntity<Page<Job>> getAllJobs(Pageable pageable) {
        return ResponseEntity.ok(jobService.getAllJobs(pageable));
    }

    /**
     * Get all jobs WITH platform discovery links
     * Returns: jobs (from APIs) + platform search links (for non-API platforms)
     * @param keyword optional search keyword
     * @param location optional location filter
     * @return jobs and platform links for all platforms
     */
    @GetMapping("/discovery")
    public ResponseEntity<JobsResponseDto> getJobsWithPlatforms(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location
    ) {
        try {
            // Get jobs (default pagination)
            Page<Job> jobsPage = jobService.getAllJobs(PageRequest.of(0, 50));
            List<?> jobs = jobsPage.getContent();

            // Generate platform links for non-API platforms
            Map<String, String> platformLinks = platformLinkGenerator.generatePlatformLinks(
                    keyword != null ? keyword : "jobs",
                    location != null ? location : ""
            );

            // Get platform information for platform cards
            List<PlatformInfoDto> platformInfo = Arrays.stream(Platform.values())
                    .map(p -> new PlatformInfoDto(p.getDisplayName(), p.getDescription(), p.getBaseUrl(), p.isApiPlatform()))
                    .collect(Collectors.toList());

            // Extract sources
            Set<String> sources = ((List<Job>) jobs).stream()
                    .map(Job::getSource)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            // Build response
            JobsResponseDto response = new JobsResponseDto(
                    jobs,
                    platformLinks,
                    platformInfo,
                    (int) jobsPage.getTotalElements(),
                    new ArrayList<>(sources)
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Advanced search with keyword, location, and source filtering
     * Flexible filtering: supports any combination of parameters
     * @param keyword job title or description keywords
     * @param location job location
     * @param source job source/platform (LinkedIn, Indeed, etc.)
     * @param pageable pagination parameters
     * @return paginated search results
     */
    @GetMapping("/search")
    public ResponseEntity<Page<Job>> searchJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String source,
            Pageable pageable
    ) {
        return ResponseEntity.ok(jobService.searchJobs(keyword, location, source, pageable));
    }

    /**
     * Create a new job (admin/system use)
     * @param job job details to create
     * @return created job with ID
     */
    @PostMapping("/create")
    public ResponseEntity<Job> createJob(@RequestBody Job job) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.saveJob(job));
    }

    /**
     * Get jobs by specific source/platform with pagination
     * @param platform source name (LinkedIn, Indeed, Naukri, etc.)
     * @param pageable pagination parameters
     * @return paginated jobs from specified platform
     */
    @GetMapping("/source/{platform}")
    public ResponseEntity<Page<Job>> jobsBySource(
            @PathVariable String platform,
            Pageable pageable
    ) {
        return ResponseEntity.ok(jobService.getJobsBySource(platform, pageable));
    }

    /**
     * Aggregate jobs from all sources
     * Fetches jobs from multiple platforms and stores deduplicated results
     * @param keyword optional search keyword for aggregation
     * @param location optional location filter for aggregation
     * @return aggregation summary with counts
     */
    @PostMapping("/aggregate")
    public ResponseEntity<String> aggregateJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location
    ) {
        int added = jobService.aggregateAndStoreJobs(keyword, location);
        return ResponseEntity.ok("Aggregation completed. New jobs added: " + added);
    }
}
