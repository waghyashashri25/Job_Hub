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
 * 100% Free Public Connector for RemoteOK Job Feed.
 * Requires NO API key. Covers global tech, engineering, devops, copywriting, and customer support.
 */
@Component
public class RemoteOKConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(RemoteOKConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    public RemoteOKConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "REMOTEOK";
    }

    @Override
    public String getDisplayName() {
        return "RemoteOK";
    }

    @Override
    public boolean isConfigured() {
        return true; // Public unauthenticated feed
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();
        String kw = (keyword == null) ? "" : keyword.trim().toLowerCase();
        String loc = (location == null) ? "" : location.trim().toLowerCase();

        try {
            String url = "https://remoteok.com/api";

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
                        .message("Empty response from RemoteOK API")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            List<Job> jobs = new ArrayList<>();

            if (root.isArray()) {
                // First element in RemoteOK array is legal/meta disclaimer
                for (int i = 1; i < root.size() && jobs.size() < 40; i++) {
                    JsonNode node = root.get(i);
                    String position = node.path("position").asText("");
                    String company = node.path("company").asText("");
                    String jobLoc = node.path("location").asText("Remote / Worldwide");
                    String applyUrl = node.path("url").asText("");
                    String description = node.path("description").asText("");

                    String tags = "";
                    JsonNode tagsNode = node.path("tags");
                    if (tagsNode.isArray()) {
                        List<String> tagList = new ArrayList<>();
                        for (JsonNode t : tagsNode) {
                            tagList.add(t.asText());
                        }
                        tags = String.join(" ", tagList);
                    }

                    String combinedText = (position + " " + company + " " + tags + " " + description).toLowerCase();
                    boolean matchesKw = kw.isBlank() || combinedText.contains(kw);
                    boolean matchesLoc = location == null || location.isBlank() || locationNormalizer.matchesLocation(jobLoc, location);

                    if (matchesKw && matchesLoc && !position.isBlank() && !company.isBlank()) {
                        Job job = new Job();
                        job.setTitle(position);
                        job.setCompany(company);
                        job.setLocation(jobLoc.isBlank() ? "Remote / Worldwide" : jobLoc);
                        job.setDescription(description.length() > 1000 ? description.substring(0, 1000) + "..." : description);
                        job.setSource("RemoteOK");
                        job.setApplyLink(applyUrl.isBlank() ? "https://remoteok.com" : applyUrl);
                        job.setPostedTime(LocalDateTime.now());
                        jobs.add(job);
                    }
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No matching roles in RemoteOK" : "Discovered " + jobs.size() + " opportunities")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("RemoteOKConnector search failed: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("RemoteOK API Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
