package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "jobs.scheduler.enabled", havingValue = "true")
public class JobScheduler {

    private static final Logger logger = LoggerFactory.getLogger(JobScheduler.class);

    private final JobService jobService;

    public JobScheduler(JobService jobService) {
        this.jobService = jobService;
    }

    @Scheduled(fixedRateString = "${jobs.scheduler.fixed-rate-ms:600000}")
    public void aggregateJobsOnSchedule() {
        long start = System.currentTimeMillis();
        logger.info("Job scheduler started aggregation cycle.");

        try {
            JobService.AggregationResult result = jobService.aggregateAndStoreJobsWithStats(null, null);
            long elapsed = System.currentTimeMillis() - start;

            logger.info(
                    "Job scheduler finished. fetched={}, added={}, totalStored={}, durationMs={}",
                    result.getFetchedCount(),
                    result.getNewJobsAdded(),
                    result.getTotalJobsStored(),
                    elapsed
            );
        } catch (Exception ex) {
            logger.error("Job scheduler failed during aggregation cycle.", ex);
        }
    }
}
