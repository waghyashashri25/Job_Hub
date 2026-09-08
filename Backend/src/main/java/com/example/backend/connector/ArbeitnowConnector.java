package com.example.backend.connector;

import com.example.backend.model.Job;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class ArbeitnowConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(ArbeitnowConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ArbeitnowConnector(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getSourceId() {
        return "ARBEITNOW";
    }

    @Override
    public String getDisplayName() {
        return "Arbeitnow";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        try {
            String url = "https://www.arbeitnow.com/api/job-board-api";
            String responseBody = restTemplate.getForObject(url, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from Arbeitnow API")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode data = root.path("data");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : data) {
                boolean isRemote = node.path("remote").asBoolean(false);
                String jobLoc = isRemote ? "Remote / Worldwide" : node.path("location").asText("Europe");

                Job job = new Job();
                job.setTitle(node.path("title").asText(""));
                job.setCompany(node.path("company_name").asText(""));
                job.setLocation(jobLoc);
                job.setDescription(node.path("description").asText(""));
                job.setSource("Arbeitnow");
                job.setApplyLink(node.path("url").asText("https://www.arbeitnow.com"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank()) {
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No jobs in Arbeitnow feed" : "Fetched " + jobs.size() + " live jobs")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("ArbeitnowConnector query failed: {}", ex.getMessage());
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
