package com.example.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Diagnostic DTO for deep inspection and audit of the Search Engine Pipeline
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchDiagnosticDto {

    @JsonProperty("query")
    private DiagnosticQueryMeta query;

    @JsonProperty("sources")
    private Map<String, SourceDiagnosticDetail> sources;

    @JsonProperty("pipelineMetrics")
    private PipelineMetrics pipelineMetrics;

    @JsonProperty("results")
    private List<JobDiagnosticSummary> results;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiagnosticQueryMeta {
        private String keyword;
        private String location;
        private String normalizedCity;
        private boolean isRemoteQuery;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SourceDiagnosticDetail {
        private String requestedKeyword;
        private String requestedLocation;
        private int rawFetchedCount;
        private int locationMatchedCount;
        private int relevanceMatchedCount;
        private String status;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipelineMetrics {
        private int totalRawDiscovered;
        private int totalLocationFiltered;
        private int totalRelevanceFiltered;
        private int totalDuplicatesRemoved;
        private int finalReturnedCount;
        private long executionDurationMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobDiagnosticSummary {
        private Long id;
        private String title;
        private String company;
        private String location;
        private String source;
        private String applyLink;
        private int relevanceScore;
        private String relevanceTier;
        private String matchReason;
    }
}
