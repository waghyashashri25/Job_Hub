package com.example.backend.service;

import com.example.backend.model.Platform;
import org.springframework.stereotype.Service;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Service to generate platform-specific job search URLs
 * Supports dynamic URL generation for all non-API platforms
 */
@Service
public class PlatformLinkGenerator {

  /**
   * Generate search URLs for all non-API platforms
   * @param keyword Job title or keyword
   * @param location Job location
   * @return Map<Platform Name, Search URL>
   */
  public Map<String, String> generatePlatformLinks(String keyword, String location) {
    Map<String, String> links = new HashMap<>();

    try {
      String encodedKeyword = URLEncoder.encode(keyword != null ? keyword : "", "UTF-8");
      String encodedLocation = URLEncoder.encode(location != null ? location : "", "UTF-8");

      for (Platform platform : Platform.getNonApiPlatforms()) {
        String searchUrl = generateSearchUrl(platform, encodedKeyword, encodedLocation);
        links.put(platform.getDisplayName(), searchUrl);
      }
    } catch (UnsupportedEncodingException e) {
      e.printStackTrace();
    }

    return links;
  }

  /**
   * Generate platform-specific search URL
   */
  private String generateSearchUrl(Platform platform, String keyword, String location)
      throws UnsupportedEncodingException {
    switch (platform) {
      case GLASSDOOR:
        return String.format("%s?keyword=%s&location=%s", platform.getBaseUrl(), keyword, location);

      case MONSTER:
        return String.format("%s?q=%s&where=%s", platform.getBaseUrl(), keyword, location);

      case TIMESJOBS:
        return String.format("%s?keyword=%s&location=%s", platform.getBaseUrl(), keyword, location);

      case SIMPLYHIRED:
        return String.format("%s?q=%s&l=%s", platform.getBaseUrl(), keyword, location);

      case WELLFOUND:
        return String.format("%s?query=%s&locale=%s", platform.getBaseUrl(), keyword, location);

      case DICE:
        return String.format("%s?query=%s&Location=%s", platform.getBaseUrl(), keyword, location);

      case FLIPKART_CAREERS:
        return platform.getBaseUrl() + "?keyword=" + keyword;

      case AMAZON_JOBS:
        return platform.getBaseUrl() + "?keyword=" + keyword;

      case GOOGLE_CAREERS:
        return platform.getBaseUrl();

      case GITHUB_JOBS:
        return String.format("%s?description=%s&location=%s", platform.getBaseUrl(), keyword, location);

      case STACK_OVERFLOW:
        return String.format("%s?tab=newest&q=%s", platform.getBaseUrl(), keyword);

      default:
        return platform.getBaseUrl();
    }
  }

  /**
   * Get platform information for frontend (for platform cards)
   */
  public Map<String, Object> getPlatformInfo(Platform platform) {
    Map<String, Object> info = new HashMap<>();
    info.put("name", platform.getDisplayName());
    info.put("description", platform.getDescription());
    info.put("baseUrl", platform.getBaseUrl());
    info.put("isApiPlatform", platform.isApiPlatform());
    return info;
  }
}
