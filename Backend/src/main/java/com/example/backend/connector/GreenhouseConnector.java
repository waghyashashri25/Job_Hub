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
 * 100% Free Direct Corporate Board Connector for Greenhouse ATS.
 * Queries public career boards of top tech companies and startups.
 * 100% Authentic, zero spam, direct application links.
 */
@Component
public class GreenhouseConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(GreenhouseConnector.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    // Notable companies with open Greenhouse boards
    private static final String[] BOARD_COMPANIES = {
            "stripe", "cloudflare", "figma", "datadog", "razorpay", "airbnb", "github"
    };

    public GreenhouseConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "GREENHOUSE";
    }

    @Override
    public String getDisplayName() {
        return "Greenhouse ATS";
    }

    @Override
    public boolean isConfigured() {
        return true; // Public open career boards
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();
        String kw = (keyword == null) ? "" : keyword.trim().toLowerCase();
        String loc = (location == null) ? "" : location.trim().toLowerCase();

        List<Job> jobs = new ArrayList<>();

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "JobHub/2.0 (Job Aggregation Engine)");
        headers.set("Accept", "application/json");
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        for (String companySlug : BOARD_COMPANIES) {
            if (jobs.size() >= 30) break;

            try {
                String url = "https://boards-api.greenhouse.io/v1/boards/" + companySlug + "/jobs";
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, requestEntity, String.class);
                String responseBody = response.getBody();

                if (responseBody == null || responseBody.isBlank()) continue;

                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode jobsArray = root.path("jobs");

                String compDisplayName = companySlug.substring(0, 1).toUpperCase() + companySlug.substring(1);

                for (JsonNode node : jobsArray) {
                    String title = node.path("title").asText("");
                    String jobLoc = node.path("location").path("name").asText("Global / Remote");
                    String applyUrl = node.path("absolute_url").asText("");

                    // Match keyword and location
                    String combinedText = (title + " " + compDisplayName).toLowerCase();
                    boolean matchesKw = kw.isBlank() || combinedText.contains(kw);
                    boolean matchesLoc = location == null || location.isBlank() || locationNormalizer.matchesLocation(jobLoc, location);

                    if (matchesKw && matchesLoc && !title.isBlank()) {
                        Job job = new Job();
                        job.setTitle(title);
                        job.setCompany(compDisplayName);
                        job.setLocation(jobLoc.isBlank() ? "Remote" : jobLoc);
                        job.setDescription(compDisplayName + " is hiring for " + title + " in " + jobLoc + ". Direct application on official company career portal.");
                        job.setSource("Direct ATS");
                        job.setApplyLink(applyUrl);
                        job.setPostedTime(LocalDateTime.now());
                        jobs.add(job);
                    }

                    if (jobs.size() >= 30) break;
                }
            } catch (Exception ex) {
                logger.debug("Greenhouse board query for {} skipped: {}", companySlug, ex.getMessage());
            }
        }

        return ConnectorResult.builder()
                .sourceId(getSourceId())
                .displayName(getDisplayName())
                .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                .message(jobs.isEmpty() ? "No matching roles across direct ATS boards" : "Discovered " + jobs.size() + " authentic direct opportunities")
                .jobs(jobs)
                .rawCount(jobs.size())
                .durationMs(System.currentTimeMillis() - start)
                .build();
    }
}
