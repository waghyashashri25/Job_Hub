package com.example.backend.connector;

import com.example.backend.model.Job;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class JSearchConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(JSearchConnector.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    @Value("${jobs.api.jsearch.key:}")
    private String jsearchApiKey;

    public JSearchConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "JSEARCH";
    }

    @Override
    public String getDisplayName() {
        return "JSearch";
    }

    @Override
    public boolean isConfigured() {
        return jsearchApiKey != null && !jsearchApiKey.isBlank();
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        if (!isConfigured()) {
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("API_KEY_MISSING")
                    .message("RapidAPI JSearch key not configured (JOBS_API_JSEARCH_KEY)")
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }

        try {
            String query = (keyword == null || keyword.isBlank()) ? "Software Engineer" : keyword.trim();
            if (location != null && !location.isBlank() && !locationNormalizer.isWorldwideQuery(location)) {
                if (locationNormalizer.isAllIndiaQuery(location)) {
                    query += " in India";
                } else {
                    query += " in " + location.trim();
                }
            }

            String url = "https://jsearch.p.rapidapi.com/search-v2?query=" + URLEncoder.encode(query, StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-RapidAPI-Key", jsearchApiKey.trim());
            headers.set("X-RapidAPI-Host", "jsearch.p.rapidapi.com");

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);

            if (response.getBody() == null || response.getBody().isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from JSearch")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");
            JsonNode jobsNode = data.has("jobs") ? data.path("jobs") : (data.isArray() ? data : root.path("jobs"));
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : jobsNode) {
                String fullLoc = node.path("job_location").asText("");
                String city = node.path("job_city").asText("");
                String country = node.path("job_country").asText("");
                String loc = !fullLoc.isBlank() ? fullLoc : (!city.isBlank() ? city + (country.isBlank() ? "" : ", " + country) : (country.isBlank() ? "Global" : country));

                String comp = node.path("employer_name").asText("");

                Job job = new Job();
                job.setTitle(node.path("job_title").asText(""));
                job.setCompany(comp.isBlank() ? "Technology Enterprise" : comp);
                job.setLocation(loc);
                job.setDescription(node.path("job_description").asText(""));
                job.setSource("JSearch");
                job.setApplyLink(node.path("job_apply_link").asText("https://jsearch.p.rapidapi.com"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank()) {
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No jobs found on JSearch" : "Fetched " + jobs.size() + " live jobs from JSearch")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("JSearchConnector error: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("JSearch Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
