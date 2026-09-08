package com.example.backend.connector;

import com.example.backend.model.Job;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Free Developer Tier Connector for Jooble (500 requests/day).
 * Covers wide range of Indian local jobs (Mumbai, Bengaluru, Pune, Delhi, etc.) and global roles.
 * Configured via jobs.api.jooble.key in application.properties or JOBS_API_JOOBLE_KEY env var.
 */
@Component
public class JoobleConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(JoobleConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    @Value("${jobs.api.jooble.key:}")
    private String apiKey;

    public JoobleConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "JOOBLE";
    }

    @Override
    public String getDisplayName() {
        return "Jooble";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isBlank();
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        if (!isConfigured()) {
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("API_KEY_MISSING")
                    .message("Jooble free API key not configured. Add JOBS_API_JOOBLE_KEY to activate.")
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(0)
                    .build();
        }

        try {
            String url = "https://jooble.org/api/" + apiKey.trim();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("User-Agent", "JobHub/2.0 (Job Aggregation Engine)");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("keywords", (keyword == null || keyword.isBlank()) ? "Software Engineer" : keyword.trim());
            if (location != null && !location.isBlank() && !locationNormalizer.isWorldwideQuery(location)) {
                if (locationNormalizer.isAllIndiaQuery(location)) {
                    requestBody.put("location", "India");
                } else {
                    requestBody.put("location", location.trim());
                }
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String responseBody = restTemplate.postForObject(url, entity, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from Jooble API")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode jobsArray = root.path("jobs");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : jobsArray) {
                String title = node.path("title").asText("");
                String company = node.path("company").asText("Enterprise Employer");
                String jobLoc = node.path("location").asText(location != null && !location.isBlank() ? location : "India");
                String snippet = node.path("snippet").asText("");
                String link = node.path("link").asText("");

                if (!title.isBlank() && !link.isBlank()) {
                    Job job = new Job();
                    job.setTitle(title);
                    job.setCompany(company.isBlank() ? "Enterprise Employer" : company);
                    job.setLocation(jobLoc);
                    job.setDescription(snippet);
                    job.setSource("Jooble");
                    job.setApplyLink(link);
                    job.setPostedTime(LocalDateTime.now());
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No jobs returned by Jooble" : "Discovered " + jobs.size() + " opportunities via Jooble")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("JoobleConnector query failed: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("Jooble API Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
