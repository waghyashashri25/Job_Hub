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
public class USAJobsConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(USAJobsConnector.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    @Value("${jobs.api.usajobs.key:}")
    private String usaJobsApiKey;

    @Value("${jobs.api.usajobs.user-agent:}")
    private String usaJobsUserAgent;

    public USAJobsConnector(RestTemplate restTemplate, ObjectMapper objectMapper, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "USAJOBS";
    }

    @Override
    public String getDisplayName() {
        return "USAJOBS";
    }

    @Override
    public boolean isConfigured() {
        return usaJobsApiKey != null && !usaJobsApiKey.isBlank();
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        if (!isConfigured()) {
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("API_KEY_MISSING")
                    .message("USAJOBS API credentials not set (JOBS_API_USAJOBS_KEY)")
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }

        try {
            String query = (keyword == null || keyword.isBlank()) ? "Software" : keyword.trim();
            String locParam = "";
            if (location != null && !location.isBlank() && !locationNormalizer.isWorldwideQuery(location)) {
                locParam = "&LocationName=" + URLEncoder.encode(location.trim(), StandardCharsets.UTF_8);
            }
            String url = "https://data.usajobs.gov/api/search?Keyword=" + URLEncoder.encode(query, StandardCharsets.UTF_8) + locParam;

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", usaJobsUserAgent != null && !usaJobsUserAgent.isBlank() ? usaJobsUserAgent : "JobHub/1.0");
            headers.set("Authorization-Key", usaJobsApiKey.trim());

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);

            if (response.getBody() == null || response.getBody().isBlank()) {
                return ConnectorResult.builder()
                        .sourceId(getSourceId())
                        .displayName(getDisplayName())
                        .status("NO_RESULTS")
                        .message("Empty response from USAJOBS")
                        .jobs(Collections.emptyList())
                        .rawCount(0)
                        .durationMs(System.currentTimeMillis() - start)
                        .build();
            }

            JsonNode items = objectMapper.readTree(response.getBody()).path("SearchResult").path("SearchResultItems");
            List<Job> jobs = new ArrayList<>();

            for (JsonNode item : items) {
                JsonNode desc = item.path("MatchedObjectDescriptor");
                Job job = new Job();
                job.setTitle(desc.path("PositionTitle").asText(""));
                job.setCompany(desc.path("OrganizationName").asText("US Public Sector"));
                job.setLocation(desc.path("PositionLocationDisplay").asText("United States"));
                job.setDescription(desc.path("QualificationSummary").asText(""));
                job.setSource("USAJOBS");
                job.setApplyLink(desc.path("PositionURI").asText("https://www.usajobs.gov"));
                job.setPostedTime(LocalDateTime.now());

                if (!job.getTitle().isBlank()) {
                    jobs.add(job);
                }
            }

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(jobs.isEmpty() ? "NO_RESULTS" : "SUCCESS")
                    .message(jobs.isEmpty() ? "No jobs matched on USAJOBS" : "Fetched " + jobs.size() + " live jobs from USAJOBS")
                    .jobs(jobs)
                    .rawCount(jobs.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("USAJobsConnector error: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("USAJOBS Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
