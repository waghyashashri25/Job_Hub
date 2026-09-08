package com.example.backend.dto;

import com.example.backend.model.Job;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Unified Search Response DTO for the Multi-Source Search Pipeline
 * Encapsulates real aggregated jobs, pagination metadata, dynamic external platform search links,
 * and per-source aggregation statistics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResponseDto {

    @JsonProperty("jobs")
    private List<Job> jobs;

    @JsonProperty("totalElements")
    private long totalElements;

    @JsonProperty("page")
    private int page;

    @JsonProperty("size")
    private int size;

    @JsonProperty("totalPages")
    private int totalPages;

    @JsonProperty("hasNext")
    private boolean hasNext;

    @JsonProperty("hasPrevious")
    private boolean hasPrevious;

    @JsonProperty("externalSearchLinks")
    private List<PlatformSearchCardDto> externalSearchLinks;

    @JsonProperty("sourceStats")
    private Map<String, Integer> sourceStats;

    @JsonProperty("sourceStatuses")
    private Map<String, String> sourceStatuses;

    @JsonProperty("remoteJobsCount")
    private int remoteJobsCount;

    @JsonProperty("query")
    private QueryMetaDto query;

    @JsonProperty("timestamp")
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    /**
     * DTO representing a non-API / external platform discovery search card
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlatformSearchCardDto {
        private String platform;
        private String displayName;
        private String searchUrl;
        private String description;
        private String icon;
        private boolean isApiPlatform;
        private String targetKeyword;
        private String targetLocation;
    }

    /**
     * DTO capturing query metadata for observability and UI state synchronization
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QueryMetaDto {
        private String keyword;
        private String location;
        private String source;
    }
}
