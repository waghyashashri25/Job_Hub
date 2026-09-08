package com.example.backend.controller;

import com.example.backend.dto.JobsResponseDto;
import com.example.backend.dto.JobsResponseDto.PlatformInfoDto;
import com.example.backend.dto.SearchDiagnosticDto;
import com.example.backend.dto.SearchResponseDto;
import com.example.backend.model.Job;
import com.example.backend.model.Platform;
import com.example.backend.service.JobService;
import com.example.backend.service.PlatformLinkGenerator;
import com.example.backend.service.SearchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;
    private final SearchService searchService;
    private final PlatformLinkGenerator platformLinkGenerator;

    public JobController(JobService jobService, SearchService searchService, PlatformLinkGenerator platformLinkGenerator) {
        this.jobService = jobService;
        this.searchService = searchService;
        this.platformLinkGenerator = platformLinkGenerator;
    }

    /**
     * Get all jobs with pagination support
     */
    @GetMapping({"", "/"})
    public ResponseEntity<Page<Job>> getAllJobsAlias(Pageable pageable) {
        return ResponseEntity.ok(jobService.getAllJobs(pageable));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<Job>> getAllJobs(Pageable pageable) {
        return ResponseEntity.ok(jobService.getAllJobs(pageable));
    }

    /**
     * Multi-source Search Engine endpoint
     * Executes parallel real API calls + verified database search + dynamic 18+ platform discovery links
     */
    @GetMapping("/search")
    public ResponseEntity<SearchResponseDto> searchJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "500") int size
    ) {
        SearchResponseDto response = searchService.executeSearch(keyword, location, source, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Search Diagnostic & Audit Engine endpoint
     * Returns detailed breakdown of raw counts, location filtering, relevance filtering, and source metrics
     */
    @GetMapping({"/search/diagnostic", "/search/debug"})
    public ResponseEntity<SearchDiagnosticDto> searchDiagnostic(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String source
    ) {
        SearchDiagnosticDto diagnostic = searchService.executeDiagnosticSearch(keyword, location, source);
        return ResponseEntity.ok(diagnostic);
    }

    /**
     * Get all jobs WITH platform discovery links
     */
    @GetMapping("/discovery")
    public ResponseEntity<JobsResponseDto> getJobsWithPlatforms(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location
    ) {
        try {
            Page<Job> jobsPage = jobService.getAllJobs(PageRequest.of(0, 1000));
            List<?> jobs = jobsPage.getContent();

            Map<String, String> platformLinks = platformLinkGenerator.generatePlatformLinks(
                    keyword != null ? keyword : "jobs",
                    location != null ? location : ""
            );

            List<PlatformInfoDto> platformInfo = Arrays.stream(Platform.values())
                    .map(p -> new PlatformInfoDto(p.getDisplayName(), p.getDescription(), p.getBaseUrl(), p.isApiPlatform()))
                    .collect(Collectors.toList());

            Set<String> sources = ((List<Job>) jobs).stream()
                    .map(Job::getSource)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

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
     * Create a new job
     */
    @PostMapping("/create")
    public ResponseEntity<Job> createJob(@RequestBody Job job) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.saveJob(job));
    }

    /**
     * Get jobs by specific source/platform
     */
    @GetMapping("/source/{platform}")
    public ResponseEntity<Page<Job>> jobsBySource(
            @PathVariable String platform,
            Pageable pageable
    ) {
        return ResponseEntity.ok(jobService.getJobsBySource(platform, pageable));
    }

    /**
     * Get real internships with pagination and filtering
     */
    @GetMapping("/internships")
    public ResponseEntity<Page<Job>> getInternships(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            Pageable pageable
    ) {
        return ResponseEntity.ok(jobService.getInternships(keyword, location, pageable));
    }

    /**
     * Sync real-time internship feeds
     */
    @PostMapping("/sync-internships")
    public ResponseEntity<Map<String, Object>> syncInternships() {
        int added = jobService.syncLiveInternships();
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Live internships synchronized successfully.");
        response.put("newInternshipsAdded", added);
        return ResponseEntity.ok(response);
    }

    /**
     * Aggregate jobs from all sources
     */
    @PostMapping("/aggregate")
    public ResponseEntity<String> aggregateJobs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location
    ) {
        int added = jobService.aggregateAndStoreJobs(keyword, location);
        return ResponseEntity.ok("Aggregation completed. New jobs added: " + added);
    }

    /**
     * Trigger instant live synchronization from all external API feeds
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncLiveJobs(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false, defaultValue = "") String location
    ) {
        JobService.AggregationResult result = jobService.aggregateAndStoreJobsWithStats(keyword, location);
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "SUCCESS");
        resp.put("fetchedCount", result.getFetchedCount());
        resp.put("newJobsAdded", result.getNewJobsAdded());
        resp.put("totalJobsStored", result.getTotalJobsStored());
        return ResponseEntity.ok(resp);
    }
}
