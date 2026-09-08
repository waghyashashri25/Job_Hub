package com.example.backend.connector;

import com.example.backend.model.Job;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class AdzunaConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(AdzunaConnector.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    @Value("${jobs.api.adzuna.app-id:}")
    private String adzunaAppId;

    @Value("${jobs.api.adzuna.app-key:}")
    private String adzunaAppKey;

    private final ExecutorService executor = Executors.newFixedThreadPool(16);

    public AdzunaConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "ADZUNA";
    }

    @Override
    public String getDisplayName() {
        return "Adzuna";
    }

    @Override
    public boolean isConfigured() {
        return adzunaAppId != null && !adzunaAppId.isBlank() &&
               adzunaAppKey != null && !adzunaAppKey.isBlank();
    }

    private static final Map<String, List<String>> STATE_HUBS = new HashMap<>();
    static {
        STATE_HUBS.put("rajasthan", Arrays.asList("jaipur", "udaipur", "jodhpur", "rajasthan"));
        STATE_HUBS.put("gujarat", Arrays.asList("ahmedabad", "surat", "vadodara", "gujarat"));
        STATE_HUBS.put("gujrat", Arrays.asList("ahmedabad", "surat", "vadodara", "gujarat"));
        STATE_HUBS.put("madhya pradesh", Arrays.asList("indore", "bhopal", "madhya pradesh"));
        STATE_HUBS.put("uttar pradesh", Arrays.asList("noida", "lucknow", "kanpur", "uttar pradesh"));
        STATE_HUBS.put("maharashtra", Arrays.asList("mumbai", "pune", "nagpur", "maharashtra"));
        STATE_HUBS.put("karnataka", Arrays.asList("bengaluru", "mysore", "karnataka"));
        STATE_HUBS.put("telangana", Arrays.asList("hyderabad", "telangana"));
        STATE_HUBS.put("tamil nadu", Arrays.asList("chennai", "coimbatore", "tamil nadu"));
        STATE_HUBS.put("tamilnadu", Arrays.asList("chennai", "coimbatore", "tamil nadu"));
        STATE_HUBS.put("west bengal", Arrays.asList("kolkata", "west bengal"));
        STATE_HUBS.put("kerala", Arrays.asList("kochi", "trivandrum", "kerala"));
        STATE_HUBS.put("haryana", Arrays.asList("gurugram", "gurgaon", "faridabad", "haryana"));
        STATE_HUBS.put("punjab", Arrays.asList("chandigarh", "ludhiana", "punjab"));
        STATE_HUBS.put("goa", Arrays.asList("panaji", "goa"));
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        if (!isConfigured()) {
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("API_KEY_MISSING")
                    .message("Adzuna API credentials not configured (JOBS_API_ADZUNA_APP_ID / JOBS_API_ADZUNA_APP_KEY)")
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }

        try {
            String query = (keyword == null || keyword.isBlank()) ? "software engineer" : keyword.trim();
            List<Job> allJobs;

            if (locationNormalizer.isWorldwideQuery(location)) {
                // Worldwide search: Query major global technology hubs across US, UK, Canada, Germany, Australia, and India
                allJobs = fetchWorldwideParallel(query);
            } else if (locationNormalizer.isAllIndiaQuery(location)) {
                // Pan-India search: Query all 13 major Indian metropolitan and tech hubs in parallel
                allJobs = fetchIndiaHubsParallel(query);
            } else {
                String locNorm = (location == null) ? "" : location.trim().toLowerCase();
                List<String> stateHubs = STATE_HUBS.get(locNorm);

                if (stateHubs != null && !stateHubs.isEmpty()) {
                    allJobs = fetchHubsParallel("in", query, stateHubs);
                } else if (isCountryQuery(locNorm, "us", "usa", "united states", "america")) {
                    allJobs = fetchByCountryAndLocation("us", query, location.trim());
                } else if (isCountryQuery(locNorm, "uk", "united kingdom", "britain", "england", "london")) {
                    allJobs = fetchByCountryAndLocation("gb", query, location.trim());
                } else if (isCountryQuery(locNorm, "canada", "toronto", "vancouver")) {
                    allJobs = fetchByCountryAndLocation("ca", query, location.trim());
                } else if (isCountryQuery(locNorm, "germany", "deutschland", "berlin", "munich")) {
                    allJobs = fetchByCountryAndLocation("de", query, location.trim());
                } else if (isCountryQuery(locNorm, "australia", "sydney", "melbourne")) {
                    allJobs = fetchByCountryAndLocation("au", query, location.trim());
                } else {
                    allJobs = fetchByCountryAndLocation("in", query, location.trim());
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(allJobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(allJobs.isEmpty() ? "No jobs matched on Adzuna" : "Fetched " + allJobs.size() + " live jobs from Adzuna")
                    .jobs(allJobs)
                    .rawCount(allJobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("AdzunaConnector error: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("Adzuna API Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }

    private boolean isCountryQuery(String query, String... terms) {
        for (String t : terms) {
            if (query.contains(t)) return true;
        }
        return false;
    }

    /**
     * Worldwide aggregation: queries US, UK, Canada, Germany, Australia, and Indian tech hubs in parallel
     */
    private List<Job> fetchWorldwideParallel(String query) {
        List<CompletableFuture<List<Job>>> futures = new ArrayList<>();
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("us", query, ""), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("gb", query, ""), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("ca", query, ""), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("de", query, ""), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("au", query, ""), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("in", query, "india"), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("in", query, "bengaluru"), executor));
        futures.add(CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation("in", query, "mumbai"), executor));

        return awaitAndDeduplicate(futures, 4500);
    }

    /**
     * All Over India aggregation: queries all 13 major Indian hubs in parallel
     */
    private List<Job> fetchIndiaHubsParallel(String query) {
        List<String> hubs = Arrays.asList(
                "bengaluru", "mumbai", "pune", "hyderabad", "delhi", "chennai",
                "noida", "gurgaon", "ahmedabad", "kolkata", "jaipur", "indore", "india"
        );
        return fetchHubsParallel("in", query, hubs);
    }

    private List<Job> fetchHubsParallel(String countryCode, String query, List<String> hubs) {
        List<CompletableFuture<List<Job>>> futures = hubs.stream()
                .map(hub -> CompletableFuture.supplyAsync(() -> fetchByCountryAndLocation(countryCode, query, hub), executor))
                .collect(Collectors.toList());

        return awaitAndDeduplicate(futures, 4500);
    }

    private List<Job> awaitAndDeduplicate(List<CompletableFuture<List<Job>>> futures, long timeoutMs) {
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (Exception ex) {
            logger.debug("Adzuna parallel fetch completed partially: {}", ex.getMessage());
        }

        List<Job> allJobs = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (CompletableFuture<List<Job>> f : futures) {
            if (f.isDone() && !f.isCompletedExceptionally()) {
                try {
                    List<Job> jobs = f.get();
                    for (Job j : jobs) {
                        String key = (j.getTitle() + "|" + j.getCompany() + "|" + j.getLocation()).toLowerCase().trim();
                        if (seen.add(key)) {
                            allJobs.add(j);
                        }
                    }
                } catch (Exception ignored) {}
            }
        }
        return allJobs;
    }

    private List<Job> fetchByCountryAndLocation(String countryCode, String query, String where) {
        try {
            String baseUrl = String.format("https://api.adzuna.com/v1/api/jobs/%s/search/1?app_id=%s&app_key=%s&results_per_page=50&what=%s",
                    countryCode.toLowerCase().trim(),
                    adzunaAppId.trim(),
                    adzunaAppKey.trim(),
                    URLEncoder.encode(query, StandardCharsets.UTF_8));

            if (where != null && !where.isBlank()) {
                baseUrl += "&where=" + URLEncoder.encode(where.trim(), StandardCharsets.UTF_8);
            }

            ResponseEntity<String> response = restTemplate.getForEntity(baseUrl, String.class);
            if (response.getBody() == null || response.getBody().isBlank()) {
                return Collections.emptyList();
            }

            JsonNode results = objectMapper.readTree(response.getBody()).path("results");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : results) {
                Job job = new Job();
                job.setTitle(node.path("title").asText(""));
                String comp = node.path("company").path("display_name").asText("");
                job.setCompany(comp.isBlank() ? "Technology Partner" : comp);

                String defaultLoc;
                if ("us".equalsIgnoreCase(countryCode)) defaultLoc = "United States";
                else if ("gb".equalsIgnoreCase(countryCode)) defaultLoc = "United Kingdom";
                else if ("ca".equalsIgnoreCase(countryCode)) defaultLoc = "Canada";
                else if ("de".equalsIgnoreCase(countryCode)) defaultLoc = "Germany";
                else if ("au".equalsIgnoreCase(countryCode)) defaultLoc = "Australia";
                else defaultLoc = (where != null && !where.isBlank()) ? where : "India";

                job.setLocation(node.path("location").path("display_name").asText(defaultLoc));
                job.setDescription(node.path("description").asText(""));
                job.setSource("Adzuna");

                String redirectUrl = node.path("redirect_url").asText("");
                job.setApplyLink(redirectUrl.isBlank() ? "https://www.adzuna.com" : redirectUrl);
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank()) {
                    jobs.add(job);
                }
            }
            return jobs;
        } catch (Exception ex) {
            logger.debug("Adzuna query for [{}] in [{}] skipped: {}", where, countryCode, ex.getMessage());
            return Collections.emptyList();
        }
    }
}
