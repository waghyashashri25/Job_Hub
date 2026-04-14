package com.example.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

/**
 * Enhanced Jobs Response DTO
 * Includes both API jobs and platform search links
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobsResponseDto {

  @JsonProperty("jobs")
  private List<?> jobs;

  @JsonProperty("platformLinks")
  private Map<String, String> platformLinks;

  @JsonProperty("platformInfo")
  private List<PlatformInfoDto> platformInfo;

  @JsonProperty("totalJobs")
  private int totalJobs;

  @JsonProperty("sources")
  private List<String> sources;

  /**
   * DTO for platform card information
   */
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PlatformInfoDto {
    private String name;
    private String description;
    private String baseUrl;
    private boolean isApiPlatform;
    private String icon; // Platform icon/emoji
    
    public PlatformInfoDto(String name, String description, String baseUrl, boolean isApiPlatform) {
      this.name = name;
      this.description = description;
      this.baseUrl = baseUrl;
      this.isApiPlatform = isApiPlatform;
      this.icon = getPlatformIcon(name);
    }

    /**
     * Get platform emoji for display
     */
    private static String getPlatformIcon(String name) {
      switch (name.toLowerCase()) {
        case "linkedin":
          return "💼";
        case "indeed":
          return "🔍";
        case "naukri":
          return "📋";
        case "foundit":
          return "🎯";
        case "glassdoor":
          return "🏢";
        case "monster":
          return "👹";
        case "stack overflow":
          return "💻";
        case "github":
          return "🐙";
        case "wellfound":
          return "🚀";
        default:
          return "💼";
      }
    }
  }
}
