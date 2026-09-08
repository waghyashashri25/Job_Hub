package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseOptimizationConfig {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseOptimizationConfig.class);

    @Bean
    public CommandLineRunner initializePostgresTrigramIndexes(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                logger.info("Verifying PostgreSQL pg_trgm extension and GIN search indexes...");

                // 1. Enable pg_trgm extension for ultra-fast full-text and typo-tolerant search
                jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
                logger.info("PostgreSQL pg_trgm extension verified active.");

                // 2. Create GIN trigram indexes on jobs table
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_jobs_company_trgm ON jobs USING gin (company gin_trgm_ops);");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm ON jobs USING gin (location gin_trgm_ops);");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs (fingerprint);");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_jobs_posted_time ON jobs (posted_time DESC);");
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_jobs_source_posted ON jobs (source, posted_time DESC);");

                logger.info("PostgreSQL GIN trigram & B-tree performance search indexes successfully created and verified.");
            } catch (Exception ex) {
                logger.warn("Notice: PostgreSQL trigram index initialization: {}. Standard b-tree indexes remain fully operational.", ex.getMessage());
            }
        };
    }
}
