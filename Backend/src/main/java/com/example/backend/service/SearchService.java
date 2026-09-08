package com.example.backend.service;

import com.example.backend.connector.ConnectorCircuitBreaker;
import com.example.backend.connector.ConnectorResult;
import com.example.backend.connector.JobSourceConnector;
import com.example.backend.dto.SearchDiagnosticDto;
import com.example.backend.dto.SearchDiagnosticDto.*;
import com.example.backend.dto.SearchResponseDto;
import com.example.backend.dto.SearchResponseDto.PlatformSearchCardDto;
import com.example.backend.dto.SearchResponseDto.QueryMetaDto;
import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import com.example.backend.service.SearchRelevanceEngine.EvaluationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * Universal Multi-Source Job Search Orchestration Engine
 * Coordinates parallel live API connectors, centralized location normalization,
 * generic multi-tier relevance scoring, deduplication, and dynamic platform link generation.
 */
@Service
public class SearchService {

    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);

    private final List<JobSourceConnector> connectors;
    private final JobRepository jobRepository;
    private final PlatformLinkGenerator platformLinkGenerator;
    private final LocationNormalizer locationNormalizer;
    private final SearchRelevanceEngine relevanceEngine;

    private final ConnectorCircuitBreaker circuitBreaker;
    private final org.springframework.cache.CacheManager cacheManager;

    private final ExecutorService searchExecutor = Executors.newFixedThreadPool(12);

    public SearchService(
            List<JobSourceConnector> connectors,
            JobRepository jobRepository,
            PlatformLinkGenerator platformLinkGenerator,
            LocationNormalizer locationNormalizer,
            SearchRelevanceEngine relevanceEngine,
            ConnectorCircuitBreaker circuitBreaker,
            org.springframework.cache.CacheManager cacheManager
    ) {
        this.connectors = connectors;
        this.jobRepository = jobRepository;
        this.platformLinkGenerator = platformLinkGenerator;
        this.locationNormalizer = locationNormalizer;
        this.relevanceEngine = relevanceEngine;
        this.circuitBreaker = circuitBreaker;
        this.cacheManager = cacheManager;
    }

    public void clearSearchCache() {
        if (cacheManager != null) {
            for (String name : cacheManager.getCacheNames()) {
                org.springframework.cache.Cache c = cacheManager.getCache(name);
                if (c != null) {
                    c.clear();
                    logger.info("Cleared cache [{}] after job update", name);
                }
            }
        }
    }

    /**
     * Executes the end-to-end multi-source search pipeline with Caffeine cache & Circuit Breakers
     */
    @org.springframework.cache.annotation.Cacheable(
            value = com.example.backend.config.CacheConfig.SEARCH_CACHE,
            key = "#rawKeyword + '|' + #rawLocation + '|' + #rawSource + '|' + #page + '|' + #size",
            unless = "#result == null || #result.jobs == null || #result.jobs.isEmpty()"
    )
    public SearchResponseDto executeSearch(String rawKeyword, String rawLocation, String rawSource, int page, int size) {
        long startTime = System.currentTimeMillis();

        final String keyword = normalizeInput(rawKeyword);
        final String location = normalizeInput(rawLocation);
        final String source = normalizeInput(rawSource);
        final int targetPage = Math.max(0, page);
        final int targetSize = (size <= 0) ? 1000 : Math.min(size, 5000);

        // 1. Parallel Asynchronous Connector Execution with Circuit Breaker Protection
        Map<String, CompletableFuture<ConnectorResult>> futureMap = new LinkedHashMap<>();
        Map<String, ConnectorResult> resultMap = new LinkedHashMap<>();

        for (JobSourceConnector connector : connectors) {
            if (!source.isBlank() && !connector.getSourceId().equalsIgnoreCase(source) && !connector.getDisplayName().equalsIgnoreCase(source)) {
                continue;
            }

            // Circuit Breaker Fast-Fail Check
            if (!circuitBreaker.allowRequest(connector.getSourceId())) {
                logger.warn("CircuitBreaker [{}]: FAST-FAILING request to protect search latency", connector.getDisplayName());
                resultMap.put(connector.getDisplayName(), ConnectorResult.builder()
                        .sourceId(connector.getSourceId())
                        .displayName(connector.getDisplayName())
                        .status("CIRCUIT_OPEN")
                        .message("Circuit breaker tripped: provider paused to maintain sub-second latency")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(0)
                        .build());
                continue;
            }

            futureMap.put(connector.getDisplayName(), CompletableFuture.supplyAsync(() -> {
                try {
                    ConnectorResult cr = connector.search(keyword, location);
                    if ("SUCCESS".equalsIgnoreCase(cr.getStatus())) {
                        circuitBreaker.recordSuccess(connector.getSourceId());
                    } else if ("TIMEOUT".equalsIgnoreCase(cr.getStatus()) || "ERROR".equalsIgnoreCase(cr.getStatus())) {
                        circuitBreaker.recordFailure(connector.getSourceId());
                    }
                    return cr;
                } catch (Exception ex) {
                    circuitBreaker.recordFailure(connector.getSourceId());
                    return createErrorResult(connector.getDisplayName(), ex.getMessage());
                }
            }, searchExecutor));
        }

        // 2. High-Performance 7.0-second Non-Blocking Deadline (Allows cloud database and multi-hub APIs to finish while maintaining fast UX)
        try {
            CompletableFuture.allOf(futureMap.values().toArray(new CompletableFuture[0])).get(7000, TimeUnit.MILLISECONDS);
            for (Map.Entry<String, CompletableFuture<ConnectorResult>> entry : futureMap.entrySet()) {
                resultMap.put(entry.getKey(), entry.getValue().getNow(createTimeoutResult(entry.getKey())));
            }
        } catch (Exception ex) {
            logger.info("Non-blocking 7.0s search deadline reached. Immediate results ready; remaining connectors processing in background.");
            for (Map.Entry<String, CompletableFuture<ConnectorResult>> entry : futureMap.entrySet()) {
                if (entry.getValue().isDone()) {
                    try {
                        resultMap.put(entry.getKey(), entry.getValue().get());
                    } catch (Exception e) {
                        resultMap.put(entry.getKey(), createErrorResult(entry.getKey(), e.getMessage()));
                    }
                } else {
                    circuitBreaker.recordFailure(entry.getKey());
                    resultMap.put(entry.getKey(), createTimeoutResult(entry.getKey()));
                }
            }
        }

        // 2. Aggregate raw jobs and per-source statistics
        List<Job> allDiscovered = new ArrayList<>();
        Map<String, Integer> sourceStats = new LinkedHashMap<>();
        Map<String, String> sourceStatuses = new LinkedHashMap<>();
        Map<String, SourceDiagnosticDetail> diagnosticMap = new LinkedHashMap<>();

        int totalRaw = 0;
        int totalLocationMatched = 0;
        int totalRelevanceMatched = 0;
        int matchingRemoteCount = 0;

        List<JobWithScore> filteredWithScore = new ArrayList<>();

        for (Map.Entry<String, ConnectorResult> entry : resultMap.entrySet()) {
            String srcName = entry.getKey();
            ConnectorResult cr = entry.getValue();

            sourceStatuses.put(srcName, cr.getStatus());
            totalRaw += cr.getRawCount();

            int locMatched = 0;
            int relMatched = 0;

            for (Job job : cr.getJobs()) {
                allDiscovered.add(job);

                // Check keyword relevance first
                EvaluationResult eval = relevanceEngine.evaluateJob(job, keyword, location);

                // Track remote jobs matching the keyword
                if (eval.isRelevant() && locationNormalizer.isRemoteJob(job.getLocation())) {
                    matchingRemoteCount++;
                }

                // Apply strict location check
                boolean matchesLoc = location.isBlank() || locationNormalizer.matchesLocation(job.getLocation(), location);
                if (matchesLoc) {
                    locMatched++;
                    if (eval.isRelevant()) {
                        relMatched++;
                        filteredWithScore.add(new JobWithScore(job, eval.getScore(), eval.getTier().name(), eval.getMatchReason()));
                    }
                }
            }

            totalLocationMatched += locMatched;
            totalRelevanceMatched += relMatched;
            sourceStats.put(srcName, relMatched);

            diagnosticMap.put(srcName, SourceDiagnosticDetail.builder()
                    .requestedKeyword(keyword)
                    .requestedLocation(location)
                    .rawFetchedCount(cr.getRawCount())
                    .locationMatchedCount(locMatched)
                    .relevanceMatchedCount(relMatched)
                    .status(cr.getStatus())
                    .notes(cr.getMessage())
                    .build());
        }

        // Asynchronously persist newly discovered live external jobs to PostgreSQL
        CompletableFuture.runAsync(() -> saveNewDiscoveredJobs(allDiscovered), searchExecutor);

        // 3. Deduplication Engine
        List<JobWithScore> deduplicated = deduplicateJobsWithScores(filteredWithScore);
        int totalDuplicatesRemoved = filteredWithScore.size() - deduplicated.size();

        // 4. Source Filter if specified
        if (!source.isBlank()) {
            deduplicated = deduplicated.stream()
                    .filter(j -> j.job.getSource() != null && j.job.getSource().equalsIgnoreCase(source))
                    .collect(Collectors.toList());
        }

        // 5. Sort: Recruiter Direct Jobs first, then Relevance Score (descending), then Recency (descending), then ID (descending)
        deduplicated.sort((a, b) -> {
            boolean aDirect = a.job.getPostedByEmail() != null || "Recruiter Direct".equalsIgnoreCase(a.job.getSource());
            boolean bDirect = b.job.getPostedByEmail() != null || "Recruiter Direct".equalsIgnoreCase(b.job.getSource());
            if (aDirect != bDirect) {
                return aDirect ? -1 : 1; // Recruiter direct jobs prioritized on top
            }
            int scoreComp = Integer.compare(b.score, a.score);
            if (scoreComp != 0) return scoreComp;
            if (a.job.getPostedTime() != null && b.job.getPostedTime() != null) {
                int timeComp = b.job.getPostedTime().compareTo(a.job.getPostedTime());
                if (timeComp != 0) return timeComp;
            }
            long aId = a.job.getId() != null ? a.job.getId() : 0L;
            long bId = b.job.getId() != null ? b.job.getId() : 0L;
            return Long.compare(bId, aId);
        });

        List<Job> finalJobs = deduplicated.stream().map(j -> j.job).collect(Collectors.toList());

        // 6. Structured Diagnostic Logging (Section 21 format)
        logStructuredSearchDiagnostics(keyword, location, diagnosticMap, totalRaw, totalLocationMatched, totalRelevanceMatched, totalDuplicatesRemoved, finalJobs.size());

        // 7. Generate 19 Platform Discovery Cards (Separated from direct aggregated jobs)
        List<PlatformSearchCardDto> platformSearchCards = platformLinkGenerator.generatePlatformSearchCards(keyword, location);
        if (!source.isBlank()) {
            platformSearchCards = platformSearchCards.stream()
                    .filter(c -> c.getPlatform().equalsIgnoreCase(source) || c.getDisplayName().equalsIgnoreCase(source))
                    .collect(Collectors.toList());
        }

        // 8. Pagination
        int totalElements = finalJobs.size();
        int totalPages = (int) Math.ceil((double) totalElements / targetSize);
        int fromIndex = targetPage * targetSize;
        List<Job> pageJobs;
        if (fromIndex >= totalElements) {
            pageJobs = Collections.emptyList();
        } else {
            int toIndex = Math.min(fromIndex + targetSize, totalElements);
            pageJobs = finalJobs.subList(fromIndex, toIndex);
        }

        boolean hasNext = targetPage < totalPages - 1;
        boolean hasPrevious = targetPage > 0;

        SearchResponseDto response = SearchResponseDto.builder()
                .jobs(pageJobs)
                .totalElements(totalElements)
                .page(targetPage)
                .size(targetSize)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .hasPrevious(hasPrevious)
                .externalSearchLinks(platformSearchCards)
                .sourceStats(sourceStats)
                .sourceStatuses(sourceStatuses)
                .remoteJobsCount(matchingRemoteCount)
                .query(QueryMetaDto.builder()
                        .keyword(keyword)
                        .location(location)
                        .source(source)
                        .build())
                .timestamp(LocalDateTime.now())
                .build();

        long duration = System.currentTimeMillis() - startTime;
        logger.info("Search pipeline completed in {}ms. Discovered: {}, Filtered: {}, Page Returned: {} (Total: {})",
                duration, totalRaw, finalJobs.size(), pageJobs.size(), totalElements);

        return response;
    }

    /**
     * Executes a comprehensive diagnostic search for admin/debug inspection
     */
    public SearchDiagnosticDto executeDiagnosticSearch(String rawKeyword, String rawLocation, String rawSource) {
        long startTime = System.currentTimeMillis();

        final String keyword = normalizeInput(rawKeyword);
        final String location = normalizeInput(rawLocation);
        final String source = normalizeInput(rawSource);

        Map<String, CompletableFuture<ConnectorResult>> futureMap = new LinkedHashMap<>();
        for (JobSourceConnector connector : connectors) {
            if (!source.isBlank() && !connector.getSourceId().equalsIgnoreCase(source) && !connector.getDisplayName().equalsIgnoreCase(source)) {
                continue;
            }
            futureMap.put(connector.getDisplayName(), CompletableFuture.supplyAsync(() -> connector.search(keyword, location), searchExecutor));
        }

        Map<String, ConnectorResult> resultMap = new LinkedHashMap<>();
        try {
            CompletableFuture.allOf(futureMap.values().toArray(new CompletableFuture[0])).get(6, TimeUnit.SECONDS);
            for (Map.Entry<String, CompletableFuture<ConnectorResult>> entry : futureMap.entrySet()) {
                resultMap.put(entry.getKey(), entry.getValue().getNow(createTimeoutResult(entry.getKey())));
            }
        } catch (Exception ex) {
            for (Map.Entry<String, CompletableFuture<ConnectorResult>> entry : futureMap.entrySet()) {
                if (entry.getValue().isDone()) {
                    try {
                        resultMap.put(entry.getKey(), entry.getValue().get());
                    } catch (Exception e) {
                        resultMap.put(entry.getKey(), createErrorResult(entry.getKey(), e.getMessage()));
                    }
                } else {
                    resultMap.put(entry.getKey(), createTimeoutResult(entry.getKey()));
                }
            }
        }

        Map<String, SourceDiagnosticDetail> diagnosticMap = new LinkedHashMap<>();
        List<JobWithScore> filtered = new ArrayList<>();
        int totalRaw = 0;
        int totalLoc = 0;
        int totalRel = 0;

        for (Map.Entry<String, ConnectorResult> entry : resultMap.entrySet()) {
            String src = entry.getKey();
            ConnectorResult cr = entry.getValue();
            totalRaw += cr.getRawCount();

            int locMatched = 0;
            int relMatched = 0;

            for (Job job : cr.getJobs()) {
                boolean locOk = location.isBlank() || locationNormalizer.matchesLocation(job.getLocation(), location);
                if (locOk) {
                    locMatched++;
                    EvaluationResult eval = relevanceEngine.evaluateJob(job, keyword, location);
                    if (eval.isRelevant()) {
                        relMatched++;
                        filtered.add(new JobWithScore(job, eval.getScore(), eval.getTier().name(), eval.getMatchReason()));
                    }
                }
            }

            totalLoc += locMatched;
            totalRel += relMatched;

            diagnosticMap.put(src, SourceDiagnosticDetail.builder()
                    .requestedKeyword(keyword)
                    .requestedLocation(location)
                    .rawFetchedCount(cr.getRawCount())
                    .locationMatchedCount(locMatched)
                    .relevanceMatchedCount(relMatched)
                    .status(cr.getStatus())
                    .notes(cr.getMessage())
                    .build());
        }

        List<JobWithScore> deduplicated = deduplicateJobsWithScores(filtered);
        int duplicatesRemoved = filtered.size() - deduplicated.size();

        deduplicated.sort((a, b) -> Integer.compare(b.score, a.score));

        List<JobDiagnosticSummary> results = deduplicated.stream()
                .limit(50)
                .map(j -> JobDiagnosticSummary.builder()
                        .id(j.job.getId())
                        .title(j.job.getTitle())
                        .company(j.job.getCompany())
                        .location(j.job.getLocation())
                        .source(j.job.getSource())
                        .applyLink(j.job.getApplyLink())
                        .relevanceScore(j.score)
                        .relevanceTier(j.tier)
                        .matchReason(j.matchReason)
                        .build())
                .collect(Collectors.toList());

        return SearchDiagnosticDto.builder()
                .query(DiagnosticQueryMeta.builder()
                        .keyword(keyword)
                        .location(location)
                        .normalizedCity(locationNormalizer.extractPrimaryCity(location))
                        .isRemoteQuery(locationNormalizer.isExplicitRemoteQuery(location))
                        .build())
                .sources(diagnosticMap)
                .pipelineMetrics(PipelineMetrics.builder()
                        .totalRawDiscovered(totalRaw)
                        .totalLocationFiltered(totalLoc)
                        .totalRelevanceFiltered(totalRel)
                        .totalDuplicatesRemoved(duplicatesRemoved)
                        .finalReturnedCount(results.size())
                        .executionDurationMs(System.currentTimeMillis() - startTime)
                        .build())
                .results(results)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private void logStructuredSearchDiagnostics(
            String keyword, String location,
            Map<String, SourceDiagnosticDetail> diagnostics,
            int rawCount, int locCount, int relCount, int dupCount, int finalCount
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n=============================================================");
        sb.append("\nSEARCH REQUEST");
        sb.append("\nkeyword=").append(keyword);
        sb.append("\nlocation=").append(location);
        sb.append("\n");

        for (Map.Entry<String, SourceDiagnosticDetail> entry : diagnostics.entrySet()) {
            SourceDiagnosticDetail d = entry.getValue();
            sb.append("\nSOURCE: ").append(entry.getKey());
            sb.append("\nrequestSent=").append(!d.getStatus().equals("API_KEY_MISSING"));
            sb.append("\nstatus=").append(d.getStatus());
            sb.append("\nrawResults=").append(d.getRawFetchedCount());
            sb.append("\nlocationMatches=").append(d.getLocationMatchedCount());
            sb.append("\nrelevantResults=").append(d.getRelevanceMatchedCount());
            sb.append("\nnotes=").append(d.getNotes());
            sb.append("\n");
        }

        sb.append("\nEXTERNAL SOURCES:");
        sb.append("\nLinkedIn URL generated");
        sb.append("\nNaukri URL generated");
        sb.append("\nIndeed URL generated");
        sb.append("\nGlassdoor URL generated");
        sb.append("\nGoogle Jobs URL generated");
        sb.append("\n");

        sb.append("\nAGGREGATION:");
        sb.append("\nRaw results=").append(rawCount);
        sb.append("\nAfter location filtering=").append(locCount);
        sb.append("\nAfter relevance filtering=").append(relCount);
        sb.append("\nDuplicates removed=").append(dupCount);
        sb.append("\nFinal unique jobs=").append(finalCount);
        sb.append("\n=============================================================");

        logger.info(sb.toString());
    }

    @org.springframework.cache.annotation.CacheEvict(
            value = {com.example.backend.config.CacheConfig.SEARCH_CACHE, com.example.backend.config.CacheConfig.DISCOVERY_CACHE},
            allEntries = true
    )
    public void saveNewDiscoveredJobs(List<Job> discoveredJobs) {
        if (discoveredJobs == null || discoveredJobs.isEmpty()) return;
        try {
            List<Job> toCheck = discoveredJobs.stream()
                    .filter(j -> j.getSource() != null && !j.getSource().equalsIgnoreCase("Database") && !j.getSource().equalsIgnoreCase("Direct"))
                    .collect(Collectors.toList());

            if (toCheck.isEmpty()) return;

            List<Job> existing = jobRepository.findAll();
            Set<String> existingKeys = existing.stream()
                    .map(j -> (j.getTitle() + "|" + j.getCompany() + "|" + j.getLocation()).toLowerCase().trim())
                    .collect(Collectors.toSet());

            List<Job> toSave = new ArrayList<>();
            for (Job j : toCheck) {
                String key = (j.getTitle() + "|" + j.getCompany() + "|" + j.getLocation()).toLowerCase().trim();
                if (!existingKeys.contains(key) && !j.getTitle().isBlank() && !j.getCompany().isBlank()) {
                    existingKeys.add(key);
                    Job newJob = new Job();
                    newJob.setTitle(j.getTitle());
                    newJob.setCompany(j.getCompany());
                    newJob.setLocation(j.getLocation());
                    newJob.setDescription(j.getDescription());
                    newJob.setSource(j.getSource());
                    newJob.setApplyLink(j.getApplyLink());
                    newJob.setPostedTime(j.getPostedTime() != null ? j.getPostedTime() : LocalDateTime.now());
                    toSave.add(newJob);
                }
            }

            if (!toSave.isEmpty()) {
                jobRepository.saveAll(toSave);
                logger.info("Dynamically ingested {} newly discovered live external opportunities into database", toSave.size());
            }
        } catch (Exception ex) {
            logger.warn("Live job ingestion notice: {}", ex.getMessage());
        }
    }

    private List<JobWithScore> deduplicateJobsWithScores(List<JobWithScore> scoredJobs) {
        Map<String, JobWithScore> uniqueMap = new LinkedHashMap<>();
        Set<String> seenUrls = new HashSet<>();

        for (JobWithScore js : scoredJobs) {
            if (js == null || js.job == null) continue;

            String normTitle = normalizeForDeduplication(js.job.getTitle());
            String normCompany = normalizeForDeduplication(js.job.getCompany());
            String normLoc = normalizeForDeduplication(js.job.getLocation());
            String dedupKey = normTitle + "|" + normCompany + "|" + normLoc;

            String applyUrl = js.job.getApplyLink() != null ? js.job.getApplyLink().trim().toLowerCase() : "";

            if (!uniqueMap.containsKey(dedupKey)) {
                if (applyUrl.isEmpty() || !seenUrls.contains(applyUrl)) {
                    uniqueMap.put(dedupKey, js);
                    if (!applyUrl.isEmpty()) seenUrls.add(applyUrl);
                }
            } else {
                JobWithScore existing = uniqueMap.get(dedupKey);
                if (js.score > existing.score) {
                    uniqueMap.put(dedupKey, js);
                }
            }
        }

        return new ArrayList<>(uniqueMap.values());
    }

    private String normalizeForDeduplication(String text) {
        if (text == null) return "";
        return text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String normalizeInput(String raw) {
        if (raw == null) return "";
        return raw.trim();
    }

    private ConnectorResult createTimeoutResult(String sourceName) {
        return ConnectorResult.builder()
                .sourceId(sourceName.toUpperCase())
                .displayName(sourceName)
                .status("TIMEOUT")
                .message("Request timed out after 6 seconds")
                .jobs(Collections.emptyList())
                .rawCount(0)
                .durationMs(6000)
                .build();
    }

    private ConnectorResult createErrorResult(String sourceName, String err) {
        return ConnectorResult.builder()
                .sourceId(sourceName.toUpperCase())
                .displayName(sourceName)
                .status("ERROR")
                .message(err)
                .jobs(Collections.emptyList())
                .rawCount(0)
                .durationMs(0)
                .build();
    }

    private static class JobWithScore {
        final Job job;
        final int score;
        final String tier;
        final String matchReason;

        JobWithScore(Job job, int score, String tier, String matchReason) {
            this.job = job;
            this.score = score;
            this.tier = tier;
            this.matchReason = matchReason;
        }
    }

    private static class CachedSearchResult {
        final SearchResponseDto response;
        final long expiresAt;

        CachedSearchResult(SearchResponseDto response, long expiresAt) {
            this.response = response;
            this.expiresAt = expiresAt;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
