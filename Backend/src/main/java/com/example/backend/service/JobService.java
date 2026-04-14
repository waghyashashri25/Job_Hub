package com.example.backend.service;

import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JobService {

    private static final Logger logger = LoggerFactory.getLogger(JobService.class);

    private final JobRepository jobRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${jobs.api.adzuna.app-id:}")
    private String adzunaAppId;

    @Value("${jobs.api.adzuna.app-key:}")
    private String adzunaAppKey;

    @Value("${jobs.api.jsearch.key:}")
    private String jsearchApiKey;

    @Value("${jobs.api.usajobs.key:}")
    private String usaJobsApiKey;

    @Value("${jobs.api.usajobs.user-agent:}")
    private String usaJobsUserAgent;

    public JobService(JobRepository jobRepository, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.jobRepository = jobRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    // ========== BASIC CRUD OPERATIONS ==========

    public Job saveJob(Job job) {
        sanitizeJob(job);
        return jobRepository.save(job);
    }

    public Page<Job> getAllJobs(Pageable pageable) {
        return jobRepository.findAll(pageable);
    }

    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    public Page<Job> getJobsBySource(String source, Pageable pageable) {
        if (source == null || source.isBlank()) {
            return getAllJobs(pageable);
        }
        return jobRepository.findBySourceIgnoreCase(source.trim(), pageable);
    }

    public List<Job> getJobsBySource(String source) {
        if (source == null || source.isBlank()) {
            return getAllJobs();
        }
        return jobRepository.findBySourceIgnoreCase(source.trim());
    }

    // ========== INTELLIGENT & FLEXIBLE SEARCH ==========

    /**
     * Smart keyword categorization for generic search terms
     * Converts vague keywords into specific search categories
     * Also handles multi-word keywords by extracting the primary word
     */
    private String mapGenericKeywordToCategory(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "";
        }
        
        String lowerKeyword = keyword.toLowerCase().trim();
        String[] words = lowerKeyword.split("\\s+");
        
        // Try to find a matching generic term
        for (String word : words) {
            if (word.matches(".*\\b(intern|internship)\\b.*")) {
                return "internship";
            }
            if (word.matches(".*\\b(fresher|entry|junior|beginner)\\b.*")) {
                return "fresher";
            }
            if (word.matches(".*\\b(developer|dev|engineer|programmer)\\b.*")) {
                return "developer";
            }
            if (word.matches(".*\\b(remote|home)\\b.*")) {
                return "remote";
            }
        }
        
        // If no generic term found, return the longest word (usually the most specific)
        // This helps with "Java developer" → use "java" or the whole phrase
        if (words.length > 1) {
            // For multi-word like "Java developer", return the first keyword part
            return words[0];
        }
        
        return keyword; // Return original keyword if no mapping found
    }

    /**
     * Enhanced search with intelligent fallback and generic keyword support
     * IMPORTANT: Always returns results, never empty!
     * Supports multi-term keywords (e.g., "Java developer" matches jobs with Java OR developer)
     */
    public Page<Job> searchJobs(String keyword, String location, String source, Pageable pageable) {
        keyword = normalizeInput(keyword);
        location = normalizeInput(location);
        source = normalizeInput(source);

        String mappedKeyword = mapGenericKeywordToCategory(keyword);
        
        logger.debug("Search request - Original: '{}', Mapped: '{}', Location: '{}', Source: '{}'",
                keyword, mappedKeyword, location, source);

        // STRATEGY 1: Try with all filters (keyword + location + source)
        if (!keyword.isBlank() && !location.isBlank() && !source.isBlank()) {
            Page<Job> results = jobRepository.searchByKeywordLocationAndSource(mappedKeyword, location, source, pageable);
            if (results.hasContent()) {
                logger.debug("Found {} results with all filters", results.getNumberOfElements());
                return results;
            }
        }

        // STRATEGY 2: Try with keyword + location (drop source)
        if (!mappedKeyword.isBlank() && !location.isBlank()) {
            Page<Job> results = jobRepository.searchByKeywordAndLocation(mappedKeyword, location, pageable);
            if (results.hasContent()) {
                logger.debug("Found {} results with keyword + location", results.getNumberOfElements());
                return results;
            }
        }

        // STRATEGY 3: Try with keyword only (drop location and source)
        if (!mappedKeyword.isBlank()) {
            Page<Job> results = jobRepository.searchByKeywordFlexible(mappedKeyword, pageable);
            if (results.hasContent()) {
                logger.debug("Found {} results with keyword only", results.getNumberOfElements());
                return results;
            }
        }

        // STRATEGY 4: Try with location only (drop keyword and source)
        if (!location.isBlank()) {
            Page<Job> results = jobRepository.searchByLocation(location, pageable);
            if (results.hasContent()) {
                logger.debug("Found {} results with location only", results.getNumberOfElements());
                return results;
            }
        }

        // STRATEGY 5: Try with source only
        if (!source.isBlank()) {
            Page<Job> results = jobRepository.findBySourceIgnoreCase(source, pageable);
            if (results.hasContent()) {
                logger.debug("Found {} results with source only", results.getNumberOfElements());
                return results;
            }
        }

        // FALLBACK: Return latest jobs from database
        logger.info("No results found with any strategy. Returning latest jobs.");
        return jobRepository.findAll(pageable);
    }



    /**
     * Legacy search method for backward compatibility (non-paginated)
     */
    public List<Job> searchJobs(String keyword, String location) {
        List<Job> jobs = jobRepository.findAll();
        return jobs.stream()
                .filter(job -> keyword == null || keyword.isBlank() || containsIgnoreCase(job.getTitle(), keyword) || containsIgnoreCase(job.getDescription(), keyword))
                .filter(job -> location == null || location.isBlank() || containsIgnoreCase(job.getLocation(), location))
                .collect(Collectors.toList());
    }

    // ========== AGGREGATION ==========

    public int aggregateAndStoreJobs(String keyword, String location) {
        return aggregateAndStoreJobsWithStats(keyword, location).getNewJobsAdded();
    }

    public AggregationResult aggregateAndStoreJobsWithStats(String keyword, String location) {
        logger.info("Starting job aggregation. keyword={}, location={}", keyword, location);
        
        List<Job> aggregated = collectJobsFromAllSources(keyword, location);
        int fetchedCount = aggregated.size();
        logger.info("Fetched {} jobs from all sources", fetchedCount);

        // Deduplicate with improved logic: title + company + source
        List<Job> deduplicated = deduplicateJobs(aggregated);
        logger.info("After deduplication: {} jobs remain", deduplicated.size());

        int before = jobRepository.findAll().size();
        saveDeduplicatedJobs(deduplicated);
        int after = jobRepository.findAll().size();
        int added = Math.max(after - before, 0);

        logger.info("Aggregation completed. Fetched={}, Added={}, Total={}", fetchedCount, added, after);
        return new AggregationResult(fetchedCount, added, after);
    }

    private List<Job> collectJobsFromAllSources(String keyword, String location) {
        List<Job> aggregated = new ArrayList<>();

        // Increased batch sizes for better data availability
        aggregated.addAll(getRedirectOnlyPlatformSamples(keyword, location, 20)); // 20 jobs per platform
        aggregated.addAll(getStaticDemoPlatformJobs(keyword, location, 10)); // 10 demo jobs
        aggregated.addAll(fetchFromRemotive(keyword, location));
        aggregated.addAll(fetchFromAdzuna(keyword, location));
        aggregated.addAll(fetchFromJSearch(keyword, location));
        aggregated.addAll(fetchFromUsaJobs(keyword, location));

        return aggregated;
    }

    // ========== DEDUPLICATION (FIXED LOGIC) ==========

    /**
     * NEW LOGIC: Deduplicate by title + company + source
     * This allows same job from different platforms to exist
     */
    private List<Job> deduplicateJobs(List<Job> jobs) {
        Map<String, Job> dedupeMap = new LinkedHashMap<>();
        
        for (Job job : jobs) {
            if (job == null) {
                continue;
            }
            
            try {
                sanitizeJob(job);
                String dedupeKey = dedupeKey(job); // title + company + source
                dedupeMap.putIfAbsent(dedupeKey, job);
            } catch (IllegalArgumentException e) {
                logger.warn("Skipping invalid job: {}", e.getMessage());
            }
        }
        
        logger.debug("Deduplicated {} jobs down to {}", jobs.size(), dedupeMap.size());
        return new ArrayList<>(dedupeMap.values());
    }

    private void saveDeduplicatedJobs(List<Job> deduplicated) {
        // Fetch existing jobs in bulk to avoid N+1 queries
        List<Job> existingJobs = jobRepository.findAll();
        Set<String> existingKeys = existingJobs.stream()
                .map(this::dedupeKey)
                .collect(Collectors.toSet());

        List<Job> jobsToSave = new ArrayList<>();
        for (Job job : deduplicated) {
            String key = dedupeKey(job);
            if (!existingKeys.contains(key)) {
                jobsToSave.add(job);
            }
        }

        if (!jobsToSave.isEmpty()) {
            jobRepository.saveAll(jobsToSave);
            logger.info("Saved {} new jobs to database", jobsToSave.size());
        }
    }

    /**
     * NEW DEDUPLICATION KEY: title + company + source
     * This is DIFFERENT from the old key (title + company only)
     * Now jobs from LinkedIn, Naukri, Indeed appear separately
     */
    private String dedupeKey(Job job) {
        return (job.getTitle() + "|" + job.getCompany() + "|" + job.getSource())
                .trim()
                .toLowerCase();
    }

    // ========== DATA VALIDATION & SANITIZATION ==========

    private void sanitizeJob(Job job) {
        if (job == null) {
            throw new IllegalArgumentException("Job cannot be null");
        }
        
        // Trim and validate title
        if (job.getTitle() == null || job.getTitle().trim().isBlank()) {
            throw new IllegalArgumentException("Job title is required");
        }
        job.setTitle(job.getTitle().trim());

        // Trim and validate company
        if (job.getCompany() == null || job.getCompany().trim().isBlank()) {
            throw new IllegalArgumentException("Job company is required");
        }
        job.setCompany(job.getCompany().trim());

        // Default location if missing
        if (job.getLocation() == null || job.getLocation().trim().isBlank()) {
            job.setLocation("Remote");
        } else {
            job.setLocation(job.getLocation().trim());
        }

        // Default description if missing
        if (job.getDescription() == null || job.getDescription().trim().isBlank()) {
            job.setDescription("No description available.");
        } else {
            job.setDescription(job.getDescription().trim());
        }

        // Validate and trim source
        if (job.getSource() == null || job.getSource().trim().isBlank()) {
            throw new IllegalArgumentException("Job source is required");
        }
        job.setSource(job.getSource().trim());

        // Validate and trim applyLink
        if (job.getApplyLink() == null || job.getApplyLink().trim().isBlank()) {
            throw new IllegalArgumentException("Job applyLink is required");
        }
        job.setApplyLink(job.getApplyLink().trim());

        // Default posted time if missing
        if (job.getPostedTime() == null) {
            job.setPostedTime(LocalDateTime.now());
        }
    }

    // ========== DATA AGGREGATION FROM PLATFORMS ==========

    private List<Job> getRedirectOnlyPlatformSamples(String keyword, String location, int jobsPerPlatform) {
        List<String> platforms = List.of(
                "LinkedIn", "Indeed", "Naukri", "Foundit", "Shine", "Apna",
                "Wellfound", "Glassdoor", "TimesJobs", "Monster", "SimplyHired"
        );

        List<Job> jobs = new ArrayList<>();
        String resolvedKeyword = (keyword == null || keyword.isBlank()) ? "Software Engineer" : keyword;
        String resolvedLocation = (location == null || location.isBlank()) ? "Remote" : location;

        for (String platform : platforms) {
            // Generate multiple jobs per platform for better data availability
            for (int i = 0; i < jobsPerPlatform; i++) {
                Job job = new Job();
                job.setTitle(resolvedKeyword + " - " + platform + " #" + (i + 1));
                job.setCompany(platform + " - Partner " + (i + 1));
                job.setLocation(resolvedLocation);
                job.setDescription("Redirect-only listing on " + platform + ". Click apply to open the original platform");
                job.setSource(platform);
                job.setApplyLink("https://www." + platform.toLowerCase().replace(" ", "") + ".com/jobs");
                job.setPostedTime(LocalDateTime.now().minusHours(i * 2)); // Stagger posted times
                jobs.add(job);
            }
        }

        logger.info("Generated {} redirect-only platform samples", jobs.size());
        return jobs;
    }

    private List<Job> getStaticDemoPlatformJobs(String keyword, String location, int jobCount) {
        List<Job> jobs = new ArrayList<>();
        String resolvedKeyword = (keyword == null || keyword.isBlank()) ? "Software Engineer" : keyword;
        String resolvedLocation = (location == null || location.isBlank()) ? "Bengaluru" : location;

        String[] demoCompanies = {
            "Internshala", "Unstop", "CoCubes", "HackerEarth", "Coding Ninjas",
            "GeeksforGeeks", "TopCoder", "CodeChef", "LeetCode", "Coursera"
        };

        for (int i = 0; i < Math.min(jobCount, demoCompanies.length); i++) {
            Job job = new Job();
            job.setTitle(resolvedKeyword + " at " + demoCompanies[i]);
            job.setCompany(demoCompanies[i] + " Demo");
            job.setLocation(resolvedLocation);
            job.setDescription("Opportunity listing on " + demoCompanies[i] + " - Demo data for testing");
            job.setSource(demoCompanies[i]);
            job.setApplyLink("https://" + demoCompanies[i].toLowerCase().replace(" ", "") + ".com");
            job.setPostedTime(LocalDateTime.now().minusDays(i));
            jobs.add(job);
        }

        logger.info("Generated {} static demo platform jobs", jobs.size());
        return jobs;
    }

    private List<Job> fetchFromRemotive(String keyword, String location) {
        try {
            String query = normalizeInput(keyword).isBlank() ? "software" : keyword;
            String url = "https://remotive.com/api/remote-jobs?search=" + query;
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getBody() == null) {
                return Collections.emptyList();
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode jobsNode = root.path("jobs");

            List<Job> jobs = new ArrayList<>();
            for (JsonNode node : jobsNode) {
                try {
                    Job job = new Job();
                    job.setTitle(node.path("title").asText(""));
                    job.setCompany(node.path("company_name").asText(""));
                    job.setLocation(node.path("candidate_required_location").asText("Remote"));
                    job.setDescription(node.path("description").asText(""));
                    job.setSource("Remotive");
                    job.setApplyLink(node.path("url").asText("https://remotive.com"));
                    job.setPostedTime(LocalDateTime.now());

                    if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                        if (location == null || location.isBlank() || containsIgnoreCase(job.getLocation(), location)) {
                            jobs.add(job);
                        }
                    }
                } catch (Exception ex) {
                    logger.warn("Error parsing Remotive job: {}", ex.getMessage());
                }
            }
            logger.info("Fetched {} jobs from Remotive", jobs.size());
            return jobs;
        } catch (Exception ex) {
            logger.warn("Error fetching from Remotive: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Job> fetchFromAdzuna(String keyword, String location) {
        if (adzunaAppId == null || adzunaAppId.isBlank() || adzunaAppKey == null || adzunaAppKey.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String query = normalizeInput(keyword).isBlank() ? "software" : keyword;
            String where = normalizeInput(location).isBlank() ? "remote" : location;
            String url = "https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=" + adzunaAppId
                    + "&app_key=" + adzunaAppKey + "&results_per_page=50&what=" + query + "&where=" + where;

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JsonNode results = objectMapper.readTree(response.getBody()).path("results");

            List<Job> jobs = new ArrayList<>();
            for (JsonNode node : results) {
                try {
                    Job job = new Job();
                    job.setTitle(node.path("title").asText(""));
                    job.setCompany(node.path("company").path("display_name").asText(""));
                    job.setLocation(node.path("location").path("display_name").asText("Unknown"));
                    job.setDescription(node.path("description").asText(""));
                    job.setSource("Adzuna");
                    job.setApplyLink(node.path("redirect_url").asText("https://www.adzuna.in"));
                    job.setPostedTime(LocalDateTime.now());

                    if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                        jobs.add(job);
                    }
                } catch (Exception ex) {
                    logger.warn("Error parsing Adzuna job: {}", ex.getMessage());
                }
            }
            logger.info("Fetched {} jobs from Adzuna", jobs.size());
            return jobs;
        } catch (Exception ex) {
            logger.warn("Error fetching from Adzuna: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Job> fetchFromJSearch(String keyword, String location) {
        if (jsearchApiKey == null || jsearchApiKey.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String query = normalizeInput(keyword).isBlank() ? "software" : keyword;
            String where = normalizeInput(location).isBlank() ? "remote" : location;
            String url = "https://jsearch.p.rapidapi.com/search?query=" + query + "%20in%20" + where + "&num_pages=1";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-RapidAPI-Key", jsearchApiKey);
            headers.set("X-RapidAPI-Host", "jsearch.p.rapidapi.com");

            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
            JsonNode results = objectMapper.readTree(response.getBody()).path("data");

            List<Job> jobs = new ArrayList<>();
            for (JsonNode node : results) {
                try {
                    Job job = new Job();
                    job.setTitle(node.path("job_title").asText(""));
                    job.setCompany(node.path("employer_name").asText(""));
                    job.setLocation(node.path("job_city").asText("") + ", " + node.path("job_country").asText(""));
                    job.setDescription(node.path("job_description").asText(""));
                    job.setSource("JSearch");
                    job.setApplyLink(node.path("job_apply_link").asText("https://rapidapi.com"));
                    job.setPostedTime(LocalDateTime.now());

                    if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                        jobs.add(job);
                    }
                } catch (Exception ex) {
                    logger.warn("Error parsing JSearch job: {}", ex.getMessage());
                }
            }
            logger.info("Fetched {} jobs from JSearch", jobs.size());
            return jobs;
        } catch (Exception ex) {
            logger.warn("Error fetching from JSearch: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Job> fetchFromUsaJobs(String keyword, String location) {
        if (usaJobsApiKey == null || usaJobsApiKey.isBlank() || usaJobsUserAgent == null || usaJobsUserAgent.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String query = normalizeInput(keyword).isBlank() ? "software" : keyword;
            String where = normalizeInput(location).isBlank() ? "" : location;
            String url = "https://data.usajobs.gov/api/search?Keyword=" + query + "&LocationName=" + where;

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization-Key", usaJobsApiKey);
            headers.set("User-Agent", usaJobsUserAgent);

            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);

            JsonNode items = objectMapper.readTree(response.getBody())
                    .path("SearchResult")
                    .path("SearchResultItems");

            List<Job> jobs = new ArrayList<>();
            for (JsonNode item : items) {
                try {
                    JsonNode descriptor = item.path("MatchedObjectDescriptor");
                    Job job = new Job();
                    job.setTitle(descriptor.path("PositionTitle").asText(""));
                    job.setCompany(descriptor.path("OrganizationName").asText("US Federal Agency"));
                    job.setLocation(descriptor.path("PositionLocationDisplay").asText("United States"));
                    job.setDescription(descriptor.path("UserArea").toString());
                    job.setSource("USAJOBS");
                    job.setApplyLink(descriptor.path("PositionURI").asText("https://www.usajobs.gov"));
                    job.setPostedTime(LocalDateTime.now());

                    if (!job.getTitle().isBlank()) {
                        jobs.add(job);
                    }
                } catch (Exception ex) {
                    logger.warn("Error parsing USAJOBS job: {}", ex.getMessage());
                }
            }
            logger.info("Fetched {} jobs from USAJOBS", jobs.size());
            return jobs;
        } catch (Exception ex) {
            logger.warn("Error fetching from USAJOBS: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    // ========== UTILITY METHODS ==========

    private String normalizeInput(String input) {
        return (input == null || input.isBlank()) ? "" : input.trim().toLowerCase();
    }

    private boolean containsIgnoreCase(String value, String search) {
        return value != null && search != null && value.toLowerCase().contains(search.toLowerCase());
    }

    // ========== AGGREGATION RESULT CLASS ==========

    public static class AggregationResult {
        private final int fetchedCount;
        private final int newJobsAdded;
        private final int totalJobsStored;

        public AggregationResult(int fetchedCount, int newJobsAdded, int totalJobsStored) {
            this.fetchedCount = fetchedCount;
            this.newJobsAdded = newJobsAdded;
            this.totalJobsStored = totalJobsStored;
        }

        public int getFetchedCount() {
            return fetchedCount;
        }

        public int getNewJobsAdded() {
            return newJobsAdded;
        }

        public int getTotalJobsStored() {
            return totalJobsStored;
        }
    }
}
