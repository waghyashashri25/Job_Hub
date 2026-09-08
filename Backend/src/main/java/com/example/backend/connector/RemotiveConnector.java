package com.example.backend.connector;

import com.example.backend.model.Job;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class RemotiveConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(RemotiveConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RemotiveConnector(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getSourceId() {
        return "REMOTIVE";
    }

    @Override
    public String getDisplayName() {
        return "Remotive";
    }

    @Override
    public boolean isConfigured() {
        return true; // Public unauthenticated API
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();
        String query = (keyword == null || keyword.isBlank()) ? "engineer" : keyword.trim();

        try {
            String url = "https://remotive.com/api/remote-jobs?search=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
            String responseBody = restTemplate.getForObject(url, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from Remotive API")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode jobsNode = root.path("jobs");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : jobsNode) {
                String candidateLoc = node.path("candidate_required_location").asText("Remote / Worldwide");
                Job job = new Job();
                job.setTitle(node.path("title").asText(""));
                job.setCompany(node.path("company_name").asText(""));
                job.setLocation(candidateLoc.isBlank() ? "Remote / Worldwide" : candidateLoc);
                job.setDescription(node.path("description").asText(""));
                job.setSource("Remotive");
                job.setApplyLink(node.path("url").asText("https://remotive.com"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank()) {
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No jobs matched query in Remotive" : "Fetched " + jobs.size() + " live jobs")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("RemotiveConnector query failed: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("API Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
