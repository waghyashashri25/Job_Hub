package com.example.backend.connector;

import com.example.backend.model.Job;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 100% Free Public Connector for Himalayas Job Platform.
 * Requires NO API key. Covers global tech, engineering, sales, marketing, and design.
 */
@Component
public class HimalayasConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(HimalayasConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    public HimalayasConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "HIMALAYAS";
    }

    @Override
    public String getDisplayName() {
        return "Himalayas";
    }

    @Override
    public boolean isConfigured() {
        return true; // Public unauthenticated endpoint
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();
        String kw = (keyword == null) ? "" : keyword.trim().toLowerCase();
        String loc = (location == null) ? "" : location.trim().toLowerCase();

        try {
            String url = "https://himalayas.app/jobs/api?limit=50";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "JobHub/2.0 (Job Aggregation Engine)");
            headers.set("Accept", "application/json");
            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, requestEntity, String.class);
            String responseBody = response.getBody();

            if (responseBody == null || responseBody.isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from Himalayas API")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode jobsNode = root.path("jobs");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : jobsNode) {
                String title = node.path("title").asText("");
                String company = node.path("companyName").asText("");
                String appLink = node.path("applicationLink").asText(node.path("guid").asText(""));
                String description = node.path("excerpt").asText(node.path("description").asText(""));

                // Location can be an array of country restrictions or string
                String locationStr = "Remote / Worldwide";
                JsonNode locRestrictions = node.path("locationRestrictions");
                if (locRestrictions.isArray() && locRestrictions.size() > 0) {
                    List<String> locs = new ArrayList<>();
                    for (JsonNode lNode : locRestrictions) {
                        locs.add(lNode.asText());
                    }
                    locationStr = String.join(", ", locs);
                }

                // Relevance check against keyword and location
                String combinedText = (title + " " + company + " " + description).toLowerCase();
                boolean matchesKw = kw.isBlank() || combinedText.contains(kw);
                boolean matchesLoc = location == null || location.isBlank() || locationNormalizer.matchesLocation(locationStr, location);

                if (matchesKw && matchesLoc && !title.isBlank() && !company.isBlank()) {
                    Job job = new Job();
                    job.setTitle(title);
                    job.setCompany(company);
                    job.setLocation(locationStr);
                    job.setDescription(description.length() > 1000 ? description.substring(0, 1000) + "..." : description);
                    job.setSource("Himalayas");
                    job.setApplyLink(appLink.isBlank() ? "https://himalayas.app" : appLink);
                    job.setPostedTime(LocalDateTime.now());
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No matching roles in Himalayas feed" : "Discovered " + jobs.size() + " opportunities")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("HimalayasConnector search failed: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("Himalayas API Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
