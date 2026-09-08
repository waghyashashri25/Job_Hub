package com.example.backend.connector;

/**
 * Standard interface for all job source connectors in JobHub.
 * Enables isolated parallel execution, source-specific query translation,
 * timeouts, and independent error reporting.
 */
public interface JobSourceConnector {

    /**
     * Unique alphanumeric identifier for this source (e.g., "ADZUNA", "REMOTIVE")
     */
    String getSourceId();

    /**
     * Human-readable display name (e.g., "Adzuna", "Remotive")
     */
    String getDisplayName();

    /**
     * True if required credentials/endpoints are set and ready to execute
     */
    boolean isConfigured();

    /**
     * Execute live search against this connector
     *
     * @param keyword  Generic search keyword (any profession, title, or skill)
     * @param location Generic location (any city, state, country, or remote)
     * @return ConnectorResult containing raw jobs and execution diagnostics
     */
    ConnectorResult search(String keyword, String location);
}
