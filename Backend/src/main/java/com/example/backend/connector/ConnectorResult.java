package com.example.backend.connector;

import com.example.backend.model.Job;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * Result model returned by each independent job platform connector
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorResult {
    private String sourceId;
    private String displayName;
    @Builder.Default
    private String status = "SUCCESS"; // SUCCESS, NO_RESULTS, API_KEY_MISSING, TIMEOUT, ERROR
    private String message;
    @Builder.Default
    private List<Job> jobs = Collections.emptyList();
    private int rawCount;
    private long durationMs;
}
