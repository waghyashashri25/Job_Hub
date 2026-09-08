package com.example.backend.connector;

import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DatabaseConnector implements JobSourceConnector {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConnector.class);
    private final JobRepository jobRepository;
    private final com.example.backend.service.LocationNormalizer locationNormalizer;

    public DatabaseConnector(JobRepository jobRepository, com.example.backend.service.LocationNormalizer locationNormalizer) {
        this.jobRepository = jobRepository;
        this.locationNormalizer = locationNormalizer;
    }

    @Override
    public String getSourceId() {
        return "DATABASE";
    }

    @Override
    public String getDisplayName() {
        return "Database";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public ConnectorResult search(String keyword, String location) {
        long start = System.currentTimeMillis();

        try {
            org.springframework.data.domain.PageRequest pageable = org.springframework.data.domain.PageRequest.of(0, 5000);
            boolean hasKw = keyword != null && !keyword.isBlank();
            boolean hasLoc = location != null && !location.isBlank();

            // 1. Always retrieve all active recruiter direct jobs so they are NEVER missed
            List<Job> recruiterJobs = jobRepository.findRecruiterDirectJobs();

            // 2. Retrieve indexed candidate jobs from repository
            List<Job> matchedDb;
            if (hasKw) {
                matchedDb = jobRepository.searchByKeywordFlexible(keyword.trim(), pageable).getContent();
            } else if (hasLoc) {
                if (locationNormalizer.isWorldwideQuery(location) || locationNormalizer.isAllIndiaQuery(location) || locationNormalizer.isExplicitRemoteQuery(location)) {
                    matchedDb = jobRepository.findAllByOrderByIdDesc(pageable).getContent();
                } else {
                    matchedDb = jobRepository.searchByLocation(location.trim(), pageable).getContent();
                }
            } else {
                matchedDb = jobRepository.findAllByOrderByIdDesc(pageable).getContent();
            }

            // 3. Merge with Recruiter Direct jobs placed first
            Set<Long> seenIds = new java.util.HashSet<>();
            List<Job> combined = new java.util.ArrayList<>();

            for (Job rj : recruiterJobs) {
                if (rj.getId() != null && seenIds.add(rj.getId())) {
                    combined.add(rj);
                }
            }

            for (Job dbJob : matchedDb) {
                if (dbJob.getId() != null && seenIds.add(dbJob.getId())) {
                    combined.add(dbJob);
                }
            }

            matchedDb = combined;

            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status(matchedDb.isEmpty() ? "DATABASE_EMPTY" : "SUCCESS")
                    .message(matchedDb.isEmpty() ? "Database returned 0 matches" : "Retrieved " + matchedDb.size() + " indexed database jobs")
                    .jobs(matchedDb)
                    .rawCount(matchedDb.size())
                    .durationMs(System.currentTimeMillis() - start)
                    .build();

        } catch (Exception ex) {
            logger.warn("DatabaseConnector query error: {}", ex.getMessage());
            return ConnectorResult.builder()
                    .sourceId(getSourceId())
                    .displayName(getDisplayName())
                    .status("ERROR")
                    .message("Database Error: " + ex.getMessage())
                    .jobs(Collections.emptyList())
                    .rawCount(0)
                    .durationMs(System.currentTimeMillis() - start)
                    .build();
        }
    }
}
