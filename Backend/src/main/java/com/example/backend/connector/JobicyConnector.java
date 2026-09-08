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
public class JobicyConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(JobicyConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public JobicyConnector(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getSourceId() {
        return "JOBICY";
    }

    @Override
    public String getDisplayName() {
        return "Jobicy";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        try {
            // Normalize tag parameter: Jobicy supports short tag queries like 'java', 'react', 'python', 'dev', etc.
            String tag = "";
            if (keyword != null && !keyword.isBlank()) {
                String[] words = keyword.trim().toLowerCase().split("\\s+");
                tag = words[0].replaceAll("[^a-z0-9]", "");
            }
            if (tag.isBlank()) {
                tag = "dev";
            }

            String url = "https://jobicy.com/api/v2/remote-jobs?count=50&tag=" + URLEncoder.encode(tag, StandardCharsets.UTF_8);
            String responseBody = restTemplate.getForObject(url, String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from Jobicy API")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode jobsNode = root.path("jobs");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode node : jobsNode) {
                String title = node.path("jobTitle").asText("");
                String company = node.path("companyName").asText("");
                String geo = node.path("jobGeo").asText("Remote / Worldwide");
                String applyUrl = node.path("url").asText("https://jobicy.com");
                String desc = node.path("jobExcerpt").asText(node.path("jobDescription").asText(""));

                if (!title.isBlank() && !company.isBlank()) {
                    Job job = new Job();
                    job.setTitle(title);
                    job.setCompany(company);
                    job.setLocation(geo.isBlank() ? "Remote / Worldwide" : geo);
                    job.setDescription(desc);
                    job.setSource("Jobicy");
                    job.setApplyLink(applyUrl);
                    job.setPostedTime(LocalDateTime.now());
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No jobs in Jobicy for tag: " + tag : "Fetched " + jobs.size() + " live jobs")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("JobicyConnector query failed: {}", ex.getMessage());
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
