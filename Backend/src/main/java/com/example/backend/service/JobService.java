package com.example.backend.service;

import com.example.backend.connector.ConnectorResult;
import com.example.backend.connector.JobSourceConnector;
import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Authentic Job Service
 * Strictly manages verified real-world opportunities from live APIs and verified sources.
 * ZERO fake or synthetic template jobs.
 */
@Service
public class JobService {

    private static final Logger logger = LoggerFactory.getLogger(JobService.class);

    private final JobRepository jobRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final PlatformLinkGenerator platformLinkGenerator;
    private final LocationNormalizer locationNormalizer;
    private final SearchRelevanceEngine relevanceEngine;
    private final List<JobSourceConnector> connectors;
    private final com.example.backend.repository.UserRepository userRepository;
    private final EmailService emailService;

    @Value("${jobs.api.adzuna.app-id:}")
    private String adzunaAppId;

    @Value("${jobs.api.adzuna.app-key:}")
    private String adzunaAppKey;

    public JobService(
            JobRepository jobRepository,
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            PlatformLinkGenerator platformLinkGenerator,
            LocationNormalizer locationNormalizer,
            SearchRelevanceEngine relevanceEngine,
            List<JobSourceConnector> connectors,
            com.example.backend.repository.UserRepository userRepository,
            EmailService emailService
    ) {
        this.jobRepository = jobRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.platformLinkGenerator = platformLinkGenerator;
        this.locationNormalizer = locationNormalizer;
        this.relevanceEngine = relevanceEngine;
        this.connectors = connectors;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @PostConstruct
    public void initDatabaseCleanAndSeed() {
        try {
            logger.info("Checking authentic job repository status...");
            long currentCount = jobRepository.count();
            if (currentCount < 300) {
                logger.info("Current repository count is {} (< 300). Aggregating opportunities across all connectors...", currentCount);
                String[] seedKeywords = {"Software Engineer", "Java Developer", "React Developer", "Python", "DevOps Engineer", "Data Analyst"};
                for (String kw : seedKeywords) {
                    try {
                        aggregateAndStoreJobs(kw, "");
                    } catch (Exception ex) {
                        logger.debug("Initial seed for kw '{}' skipped: {}", kw, ex.getMessage());
                    }
                }
                logger.info("Database expanded with authentic opportunities. Current count: {}", jobRepository.count());
            } else {
                logger.info("Database already populated with {} authentic opportunities.", currentCount);
            }

            // Backfill fingerprints for legacy records if needed
            List<Job> unindexedJobs = jobRepository.findAll().stream()
                    .filter(j -> j.getFingerprint() == null || j.getFingerprint().isBlank())
                    .collect(Collectors.toList());
            if (!unindexedJobs.isEmpty()) {
                for (Job j : unindexedJobs) {
                    j.setFingerprint(computeJobFingerprint(j.getTitle(), j.getCompany(), j.getLocation()));
                }
                jobRepository.saveAll(unindexedJobs);
                logger.info("Backfilled canonical fingerprints for {} opportunities.", unindexedJobs.size());
            }
        } catch (Exception e) {
            logger.warn("Initialization notice: {}", e.getMessage());
        }
    }

    // ========== BASIC CRUD OPERATIONS ==========

    public Job saveJob(Job job) {
        sanitizeJob(job);
        return jobRepository.save(job);
    }

    public Page<Job> getAllJobs(Pageable pageable) {
        if (pageable == null || pageable.getPageSize() < 50) {
            pageable = PageRequest.of(0, 1000);
        }
        List<Job> nonInternships = jobRepository.findAll().stream()
                .filter(j -> !isInternshipJob(j))
                .collect(Collectors.toList());

        List<Job> balancedJobs = interleaveSources(nonInternships);

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), balancedJobs.size());
        List<Job> pageContent = (start <= end) ? balancedJobs.subList(start, end) : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, balancedJobs.size());
    }

    public List<Job> getAllJobs() {
        List<Job> nonInternships = jobRepository.findAll().stream()
                .filter(j -> !isInternshipJob(j))
                .collect(Collectors.toList());
        return interleaveSources(nonInternships);
    }

    /**
     * Interleaves jobs across all platforms in round-robin fashion
     * Ensures every platform (JSearch, LinkedIn, Naukri, Indeed, Adzuna, Jobicy, Arbeitnow, Remotive)
     * is prominently represented on page 1 rather than single-source dominance.
     */
    private List<Job> interleaveSources(List<Job> jobs) {
        if (jobs == null || jobs.isEmpty()) return Collections.emptyList();

        Map<String, List<Job>> bySource = new LinkedHashMap<>();
        // Pre-seed "Recruiter Direct" so it always takes first slot in round-robin
        bySource.put("Recruiter Direct", new ArrayList<>());

        jobs.stream()
            .sorted((a, b) -> {
                if (a.getPostedTime() != null && b.getPostedTime() != null) {
                    int c = b.getPostedTime().compareTo(a.getPostedTime());
                    if (c != 0) return c;
                }
                long aId = a.getId() != null ? a.getId() : 0L;
                long bId = b.getId() != null ? b.getId() : 0L;
                return Long.compare(bId, aId);
            })
            .forEach(j -> {
                String src = (j.getSource() != null && !j.getSource().isBlank()) ? j.getSource() : "Direct";
                bySource.computeIfAbsent(src, k -> new ArrayList<>()).add(j);
            });

        List<Job> result = new ArrayList<>(jobs.size());
        boolean hasMore = true;
        int index = 0;
        while (hasMore) {
            hasMore = false;
            for (List<Job> list : bySource.values()) {
                if (index < list.size()) {
                    result.add(list.get(index));
                    hasMore = true;
                }
            }
            index++;
        }
        return result;
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

    // ========== DEDICATED REAL INTERNSHIPS ENGINE ==========

    public Page<Job> getInternships(String keyword, String location, Pageable pageable) {
        keyword = normalizeInput(keyword);
        location = normalizeInput(location);

        if (pageable == null || pageable.getPageSize() < 20) {
            pageable = PageRequest.of(0, 20);
        }

        List<Job> allDbJobs = jobRepository.findAll();
        final String kw = keyword;
        final String loc = location;

        List<Job> internships = allDbJobs.stream()
            .filter(this::isInternshipJob)
            .filter(job -> {
                if (!loc.isBlank() && !locationNormalizer.matchesLocation(job.getLocation(), loc)) {
                    return false;
                }
                if (!kw.isBlank()) {
                    return relevanceEngine.evaluateJob(job, kw, loc).isRelevant();
                }
                return true;
            })
            .sorted((a, b) -> {
                int scoreA = relevanceEngine.evaluateJob(a, kw, loc).getScore();
                int scoreB = relevanceEngine.evaluateJob(b, kw, loc).getScore();
                return Integer.compare(scoreB, scoreA);
            })
            .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), internships.size());
        List<Job> pageContent = (start <= end) ? internships.subList(start, end) : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, internships.size());
    }

    public int syncLiveInternships() {
        logger.info("Synchronizing live internship feeds from real APIs...");
        List<Job> liveInternships = fetchFromRemotive("intern", "");
        int before = (int) jobRepository.count();
        saveDeduplicatedJobs(liveInternships);
        int after = (int) jobRepository.count();
        return Math.max(after - before, 0);
    }

    private boolean isInternshipJob(Job job) {
        if (job == null) return false;
        String title = (job.getTitle() != null ? job.getTitle() : "").toLowerCase();
        String desc = (job.getDescription() != null ? job.getDescription() : "").toLowerCase();
        String src = (job.getSource() != null ? job.getSource() : "").toLowerCase();

        return title.contains("intern") || title.contains("trainee") || title.contains("fellow") ||
               title.contains("apprentice") || title.contains("student") ||
               src.equals("internshala") || src.equals("unstop") ||
               desc.contains("internship") || desc.contains("stipend");
    }

    // ========== SEARCH JOBS ==========

    public Page<Job> searchJobs(String keyword, String location, String source, Pageable pageable) {
        keyword = normalizeInput(keyword);
        location = normalizeInput(location);
        source = normalizeInput(source);

        if (pageable == null) {
            pageable = PageRequest.of(0, 20);
        }

        List<Job> allDbJobs = jobRepository.findAll();
        final String kw = keyword;
        final String loc = location;
        final String src = source;

        List<Job> matchedJobs = allDbJobs.stream()
            .filter(job -> {
                // 1. Source filter
                if (!src.isBlank() && (job.getSource() == null || !job.getSource().equalsIgnoreCase(src))) {
                    return false;
                }

                // 2. Strict Location filter
                if (!loc.isBlank() && !locationNormalizer.matchesLocation(job.getLocation(), loc)) {
                    return false;
                }

                // 3. Strict Keyword & Internship Policy filter
                if (!relevanceEngine.evaluateJob(job, kw, loc).isRelevant()) {
                    return false;
                }

                return true;
            })
            .sorted((a, b) -> {
                int scoreA = relevanceEngine.evaluateJob(a, kw, loc).getScore();
                int scoreB = relevanceEngine.evaluateJob(b, kw, loc).getScore();
                return Integer.compare(scoreB, scoreA);
            })
            .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), matchedJobs.size());
        List<Job> pageContent = (start <= end) ? matchedJobs.subList(start, end) : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, matchedJobs.size());
    }

    // ========== REAL PUBLIC APIS ==========

    public List<Job> fetchFromRemotive(String keyword, String location) {
        try {
            String query = (keyword == null || keyword.isBlank()) ? "software" : keyword;
            String url = "https://remotive.com/api/remote-jobs?search=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (response.getBody() == null) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode jobsNode = root.path("jobs");

            List<Job> jobs = new ArrayList<>();
            for (JsonNode node : jobsNode) {
                Job job = new Job();
                job.setTitle(node.path("title").asText(""));
                job.setCompany(node.path("company_name").asText(""));
                job.setLocation("Remote / Global");
                job.setDescription(node.path("description").asText(""));
                job.setSource("Remotive");
                job.setApplyLink(node.path("url").asText("https://remotive.com"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                    jobs.add(job);
                }
            }
            return jobs;
        } catch (Exception ex) {
            logger.warn("Remotive fetch notice: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<Job> fetchFromArbeitnow(String keyword, String location) {
        try {
            String url = "https://www.arbeitnow.com/api/job-board-api";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (response.getBody() == null) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");

            List<Job> jobs = new ArrayList<>();
            for (JsonNode node : data) {
                Job job = new Job();
                job.setTitle(node.path("title").asText(""));
                job.setCompany(node.path("company_name").asText(""));
                job.setLocation(node.path("remote").asBoolean(false) ? "Remote / Worldwide" : node.path("location").asText("Remote"));
                job.setDescription(node.path("description").asText(""));
                job.setSource("Arbeitnow");
                job.setApplyLink(node.path("url").asText("https://www.arbeitnow.com"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                    jobs.add(job);
                }
            }
            return jobs;
        } catch (Exception ex) {
            logger.warn("Arbeitnow fetch notice: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<Job> fetchFromAdzuna(String keyword, String location) {
        if (adzunaAppId == null || adzunaAppId.isBlank() || adzunaAppKey == null || adzunaAppKey.isBlank()) {
            return Collections.emptyList();
        }
        try {
            String query = (keyword == null || keyword.isBlank()) ? "engineer" : keyword;
            String where = (location == null || location.isBlank()) ? "india" : location;
            String url = String.format("https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=%s&app_key=%s&results_per_page=50&what=%s&where=%s",
                    adzunaAppId, adzunaAppKey,
                    URLEncoder.encode(query, StandardCharsets.UTF_8),
                    URLEncoder.encode(where, StandardCharsets.UTF_8));

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getBody() == null) return Collections.emptyList();

            JsonNode results = objectMapper.readTree(response.getBody()).path("results");
            List<Job> jobs = new ArrayList<>();
            for (JsonNode node : results) {
                Job job = new Job();
                job.setTitle(node.path("title").asText(""));
                job.setCompany(node.path("company").path("display_name").asText(""));
                job.setLocation(node.path("location").path("display_name").asText("India"));
                job.setDescription(node.path("description").asText(""));
                job.setSource("Adzuna");
                job.setApplyLink(node.path("redirect_url").asText("https://www.adzuna.in"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                    jobs.add(job);
                }
            }
            return jobs;
        } catch (Exception ex) {
            logger.warn("Adzuna fetch notice: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<Job> fetchFromJobicy(String keyword, String location) {
        try {
            String tag = (keyword == null || keyword.isBlank()) ? "dev" : keyword.toLowerCase().replaceAll("[^a-z0-9]", "");
            String url = "https://jobicy.com/api/v2/remote-jobs?count=50&tag=" + URLEncoder.encode(tag, StandardCharsets.UTF_8);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getBody() == null) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode jobsNode = root.path("jobs");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : jobsNode) {
                Job job = new Job();
                job.setTitle(node.path("jobTitle").asText(""));
                job.setCompany(node.path("companyName").asText(""));
                String geo = node.path("jobGeo").asText("Remote / Worldwide");
                job.setLocation(geo.isBlank() ? "Remote / Worldwide" : geo);
                job.setDescription(node.path("jobExcerpt").asText(node.path("jobDescription").asText("")));
                job.setSource("Jobicy");
                job.setApplyLink(node.path("url").asText("https://jobicy.com"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank() && !job.getCompany().isBlank()) {
                    jobs.add(job);
                }
            }
            return jobs;
        } catch (Exception ex) {
            logger.warn("Jobicy fetch notice: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    // ========== DEDUPLICATION & SANITIZATION ==========

    public static String computeJobFingerprint(String title, String company, String location) {
        String cleanTitle = (title == null ? "" : title.toLowerCase())
                .replaceAll("(?i)\\b(urgent|immediate|hiring|opening|needed|vacancy)\\b", "")
                .replaceAll("[^a-z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String cleanCompany = (company == null ? "" : company.toLowerCase())
                .replaceAll("(?i)\\b(pvt|ltd|limited|inc|technologies|solutions|services|corp|corporation)\\b", "")
                .replaceAll("[^a-z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String cleanCity = (location == null ? "" : location.toLowerCase())
                .replaceAll("(?i)\\b(india|maharashtra|karnataka|telangana|remote|worldwide)\\b", "")
                .replaceAll("[^a-z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String raw = cleanCompany + "|" + cleanTitle + "|" + cleanCity;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().substring(0, 32);
        } catch (Exception e) {
            return Integer.toHexString(raw.hashCode());
        }
    }

    private void saveDeduplicatedJobs(List<Job> deduplicated) {
        if (deduplicated == null || deduplicated.isEmpty()) return;

        for (Job job : deduplicated) {
            sanitizeJob(job);
            if (job.getFingerprint() == null || job.getFingerprint().isBlank()) {
                job.setFingerprint(computeJobFingerprint(job.getTitle(), job.getCompany(), job.getLocation()));
            }
        }

        // Fast in-memory deduplication of the incoming batch itself
        Map<String, Job> incomingByFp = new LinkedHashMap<>();
        for (Job job : deduplicated) {
            if (!incomingByFp.containsKey(job.getFingerprint())) {
                incomingByFp.put(job.getFingerprint(), job);
            }
        }

        List<Job> toSave = new ArrayList<>();
        for (Job candidate : incomingByFp.values()) {
            Optional<Job> existingOpt = jobRepository.findFirstByFingerprint(candidate.getFingerprint());
            if (existingOpt.isEmpty()) {
                toSave.add(candidate);
            } else {
                // If existing job has an older/generic link and candidate has a better link, update it
                Job existing = existingOpt.get();
                if (candidate.getApplyLink() != null && !candidate.getApplyLink().isBlank() &&
                        (existing.getApplyLink() == null || existing.getApplyLink().contains("google.com"))) {
                    existing.setApplyLink(candidate.getApplyLink());
                    jobRepository.save(existing);
                }
            }
        }

        if (!toSave.isEmpty()) {
            jobRepository.saveAll(toSave);
            logger.info("Saved {} authentic deduplicated opportunities to database", toSave.size());
            notifyUsersOfNewMatchingJobs(toSave);
        }
    }

    private void notifyUsersOfNewMatchingJobs(List<Job> newJobs) {
        try {
            List<com.example.backend.model.User> alertUsers = userRepository.findAll().stream()
                    .filter(u -> Boolean.TRUE.equals(u.getJobAlertsEnabled()) && u.getSkills() != null && !u.getSkills().isBlank())
                    .toList();

            if (alertUsers.isEmpty()) return;

            for (com.example.backend.model.User user : alertUsers) {
                List<String> userSkills = Arrays.stream(user.getSkills().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(String::toLowerCase)
                        .toList();

                List<Job> matched = new ArrayList<>();
                Map<Long, Integer> scores = new HashMap<>();

                for (Job job : newJobs) {
                    String title = (job.getTitle() != null ? job.getTitle() : "").toLowerCase();
                    String desc = (job.getDescription() != null ? job.getDescription() : "").toLowerCase();

                    long skillHits = userSkills.stream()
                            .filter(skill -> title.contains(skill) || desc.contains(skill))
                            .count();

                    if (skillHits > 0) {
                        int score = Math.min(65 + (int)(skillHits * 10), 98);
                        matched.add(job);
                        scores.put(job.getId(), score);
                    }
                    if (matched.size() >= 5) break;
                }

                if (!matched.isEmpty()) {
                    emailService.sendJobMatchNotificationEmail(user.getEmail(), user.getName(), matched, scores);
                    logger.info("Dispatched matching jobs notification email to {} with {} matching jobs", user.getEmail(), matched.size());
                }
            }
        } catch (Exception ex) {
            logger.debug("Notice during new job notification check: {}", ex.getMessage());
        }
    }

    private void sanitizeJob(Job job) {
        if (job == null) throw new IllegalArgumentException("Job cannot be null");
        if (job.getTitle() == null || job.getTitle().trim().isBlank()) job.setTitle("Professional Role");
        if (job.getCompany() == null || job.getCompany().trim().isBlank()) job.setCompany("Enterprise Employer");
        if (job.getLocation() == null || job.getLocation().trim().isBlank()) job.setLocation("Remote / Global");
        if (job.getDescription() == null || job.getDescription().trim().isBlank()) job.setDescription("Job details and requirements available on platform.");
        if (job.getSource() == null || job.getSource().trim().isBlank()) job.setSource("Direct");
        if (job.getApplyLink() == null || job.getApplyLink().trim().isBlank()) {
            job.setApplyLink("https://www.google.com");
        }
        if (job.getFingerprint() == null || job.getFingerprint().isBlank()) {
            job.setFingerprint(computeJobFingerprint(job.getTitle(), job.getCompany(), job.getLocation()));
        }
        if (job.getPostedTime() == null) job.setPostedTime(LocalDateTime.now());
    }

    private String normalizeInput(String input) {
        return (input == null) ? "" : input.trim();
    }

    // ========== AGGREGATION & STATS ==========

    public int aggregateAndStoreJobs(String keyword, String location) {
        return aggregateAndStoreJobsWithStats(keyword, location).getNewJobsAdded();
    }

    public AggregationResult aggregateAndStoreJobsWithStats(String keyword, String location) {
        List<Job> aggregated = new ArrayList<>();

        if (connectors != null && !connectors.isEmpty()) {
            for (JobSourceConnector connector : connectors) {
                if (connector.isConfigured()) {
                    try {
                        ConnectorResult res = connector.search(keyword, location);
                        if (res != null && res.getJobs() != null) {
                            aggregated.addAll(res.getJobs());
                        }
                    } catch (Exception e) {
                        logger.debug("Connector {} skipped during aggregation: {}", connector.getSourceId(), e.getMessage());
                    }
                }
            }
        } else {
            aggregated.addAll(fetchFromRemotive(keyword, location));
            aggregated.addAll(fetchFromArbeitnow(keyword, location));
            aggregated.addAll(fetchFromJobicy(keyword, location));
            aggregated.addAll(fetchFromAdzuna(keyword, location));
        }

        int fetchedCount = aggregated.size();
        int before = (int) jobRepository.count();
        saveDeduplicatedJobs(aggregated);
        int after = (int) jobRepository.count();
        int added = Math.max(after - before, 0);

        return new AggregationResult(fetchedCount, added, after);
    }

    @org.springframework.transaction.annotation.Transactional
    public int cleanExpiredJobs(int olderThanDays) {
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(olderThanDays);
        List<Job> expired = jobRepository.findAll().stream()
                .filter(j -> j.getPostedTime() != null && j.getPostedTime().isBefore(cutoff))
                .filter(j -> j.getSource() != null && !j.getSource().equalsIgnoreCase("DIRECT") && !j.getSource().equalsIgnoreCase("DATABASE"))
                .collect(Collectors.toList());
        if (!expired.isEmpty()) {
            jobRepository.deleteAll(expired);
            return expired.size();
        }
        return 0;
    }

    public static class AggregationResult {
        private final int fetchedCount;
        private final int newJobsAdded;
        private final int totalInDatabase;

        public AggregationResult(int fetchedCount, int newJobsAdded, int totalInDatabase) {
            this.fetchedCount = fetchedCount;
            this.newJobsAdded = newJobsAdded;
            this.totalInDatabase = totalInDatabase;
        }

        public int getFetchedCount() { return fetchedCount; }
        public int getNewJobsAdded() { return newJobsAdded; }
        public int getTotalInDatabase() { return totalInDatabase; }
        public int getTotalJobsStored() { return totalInDatabase; }
    }
}
