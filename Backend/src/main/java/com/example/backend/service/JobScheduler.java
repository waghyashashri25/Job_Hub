package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@ConditionalOnProperty(name = "jobs.scheduler.enabled", havingValue = "true")
public class JobScheduler {

    private static final Logger logger = LoggerFactory.getLogger(JobScheduler.class);

    private final JobService jobService;

    // 1. Topic & Role Rotation Queue (Top In-Demand Indian Tech Roles)
    private static final List<String> ROTATION_ROLES = Arrays.asList(
            "React Developer",
            "Java Developer",
            "Python Developer",
            "DevOps Engineer",
            "Data Analyst",
            "QA Automation Engineer",
            "Full Stack Developer",
            "Cloud Engineer",
            "Frontend Developer",
            "Node.js Developer"
    );

    // 2. City Rotation Queue (Leading Indian Tech Hubs)
    private static final List<String> ROTATION_CITIES = Arrays.asList(
            "Bengaluru",
            "Pune",
            "Mumbai",
            "Hyderabad",
            "Delhi NCR",
            "Remote",
            "Chennai"
    );

    private final AtomicInteger roleIndex = new AtomicInteger(0);
    private final AtomicInteger cityIndex = new AtomicInteger(0);
    private long lastOffPeakRunTime = 0L;
    private volatile boolean paused = false;
    private volatile String lastTarget = "None";
    private volatile long lastRunTime = 0L;
    private volatile int lastFetched = 0;
    private volatile int lastAdded = 0;

    public JobScheduler(JobService jobService) {
        this.jobService = jobService;
    }

    public boolean isPaused() {
        return paused;
    }

    public void setPaused(boolean paused) {
        this.paused = paused;
        logger.info("JobScheduler paused state set to: {}", paused);
    }

    public java.util.Map<String, Object> getSchedulerStatus() {
        java.util.Map<String, Object> status = new java.util.LinkedHashMap<>();
        status.put("enabled", !paused);
        status.put("paused", paused);
        status.put("lastTarget", lastTarget);
        status.put("lastRunTime", lastRunTime > 0 ? new java.util.Date(lastRunTime) : null);
        status.put("lastFetched", lastFetched);
        status.put("lastAdded", lastAdded);
        status.put("nextRole", ROTATION_ROLES.get(roleIndex.get() % ROTATION_ROLES.size()));
        status.put("nextCity", ROTATION_CITIES.get(cityIndex.get() % ROTATION_CITIES.size()));
        return status;
    }

    /**
     * Adaptive Scheduled Cycle:
     * - Executes every 3 minutes (180,000 ms)
     * - Peak Hours (Mon-Fri 9 AM - 7 PM IST): Runs every 3 minutes for maximum freshness.
     * - Off-Peak Hours (Nights & Weekends): Throttled to every 30 minutes to preserve API quota.
     * - Rotates role and city pairs cyclically.
     */
    @Scheduled(fixedRateString = "${jobs.scheduler.fixed-rate-ms:180000}")
    public void aggregateJobsOnSchedule() {
        if (paused) {
            logger.info("Job scheduler cycle skipped (scheduler paused by admin).");
            return;
        }

        ZonedDateTime nowIst = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        int hour = nowIst.getHour();
        DayOfWeek day = nowIst.getDayOfWeek();
        boolean isBusinessHours = (day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY && hour >= 9 && hour < 19);

        long nowMs = System.currentTimeMillis();
        if (!isBusinessHours && (nowMs - lastOffPeakRunTime < 1800000L)) {
            // Off-peak hours: sleep until 30 minutes have passed since last run
            return;
        }
        lastOffPeakRunTime = nowMs;

        // Select next rotating role & city
        String targetRole = ROTATION_ROLES.get(roleIndex.getAndIncrement() % ROTATION_ROLES.size());
        String targetCity = ROTATION_CITIES.get(cityIndex.getAndIncrement() % ROTATION_CITIES.size());

        long start = System.currentTimeMillis();
        this.lastTarget = targetRole + " in " + targetCity;
        this.lastRunTime = start;
        logger.info("Job scheduler starting adaptive aggregation cycle for role='{}', city='{}' (Mode: {})",
                targetRole, targetCity, isBusinessHours ? "Peak Business Hours (3m)" : "Off-Peak (30m)");

        try {
            JobService.AggregationResult result = jobService.aggregateAndStoreJobsWithStats(targetRole, targetCity);
            long elapsed = System.currentTimeMillis() - start;
            this.lastFetched = result.getFetchedCount();
            this.lastAdded = result.getNewJobsAdded();

            logger.info(
                    "Job scheduler cycle finished. target='{} in {}', fetched={}, added={}, totalStored={}, durationMs={}",
                    targetRole,
                    targetCity,
                    result.getFetchedCount(),
                    result.getNewJobsAdded(),
                    result.getTotalJobsStored(),
                    elapsed
            );
        } catch (Exception ex) {
            logger.error("Job scheduler notice during aggregation cycle for target='{} in {}': {}", targetRole, targetCity, ex.getMessage());
        }
    }

    /**
     * Nightly Index Maintenance & Expired Job Cleanup (Runs every night at 3:30 AM IST)
     * Prunes external stale postings older than 90 days to keep active database lean and indexes fast.
     */
    @Scheduled(cron = "0 30 3 * * ?")
    public void cleanExpiredJobs() {
        logger.info("Starting nightly expired jobs maintenance cycle...");
        try {
            int cleaned = jobService.cleanExpiredJobs(90);
            logger.info("Nightly maintenance completed. Removed {} stale opportunities older than 90 days.", cleaned);
        } catch (Exception ex) {
            logger.warn("Notice during nightly job cleanup: {}", ex.getMessage());
        }
    }
}
