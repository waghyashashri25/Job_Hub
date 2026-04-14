package com.example.backend.model;

import lombok.Getter;

/**
 * Enum defining all supported job platforms
 * Includes both API-based and non-API platforms
 */
@Getter
public enum Platform {
  // API-Based Platforms (return actual jobs)
  LINKEDIN("LinkedIn", "https://www.linkedin.com/jobs/search", true, "Professional network with millions of jobs"),
  INDEED("Indeed", "https://www.indeed.com/jobs", true, "World's largest job search engine"),
  NAUKRI("Naukri", "https://www.naukri.com/jobs", true, "India's leading job portal"),
  FOUNDIT("Foundit", "https://www.foundit.com/jobs", true, "Formerly Monster India"),
  SHINE("Shine", "https://www.shine.com/jobs", true, "India's job destination"),
  APNA("Apna", "https://apna.co/jobs", true, "India's community-driven platform"),
  
  // Non-API Platforms (redirect to search)
  GLASSDOOR("Glassdoor", "https://www.glassdoor.com/Job/jobs.htm", false, "Companies, salaries & interviews"),
  MONSTER("Monster", "https://www.monster.com/jobs/search", false, "Global job search platform"),
  TIMESJOBS("TimesJobs", "https://www.timesjobs.com/jobs", false, "Times' job portal"),
  SIMPLYHIRED("SimplyHired", "https://www.simplyhired.com/search/jobs", false, "Simple job search experience"),
  WELLFOUND("Wellfound", "https://wellfound.com/jobs", false, "Startup jobs & talent"),
  DICE("Dice", "https://www.dice.com/jobs", false, "Tech & engineering jobs"),
  FLIPKART_CAREERS("Flipkart", "https://www.flipkartcareers.com/jobs", false, "Flipkart's career portal"),
  AMAZON_JOBS("Amazon", "https://www.amazon.jobs", false, "Amazon's career portal"),
  GOOGLE_CAREERS("Google", "https://www.google.com/careers/", false, "Google's career portal"),
  GITHUB_JOBS("GitHub", "https://github.com/jobs", false, "Developer jobs on GitHub"),
  STACK_OVERFLOW("Stack Overflow", "https://stackoverflow.com/jobs", false, "Developer jobs platform");

  private final String displayName;
  private final String baseUrl;
  private final boolean isApiPlatform;
  private final String description;

  Platform(String displayName, String baseUrl, boolean isApiPlatform, String description) {
    this.displayName = displayName;
    this.baseUrl = baseUrl;
    this.isApiPlatform = isApiPlatform;
    this.description = description;
  }

  /**
   * Get all non-API platforms for redirect links
   */
  public static Platform[] getNonApiPlatforms() {
    return new Platform[]{
      GLASSDOOR, MONSTER, TIMESJOBS, SIMPLYHIRED, WELLFOUND,
      DICE, FLIPKART_CAREERS, AMAZON_JOBS, GOOGLE_CAREERS, GITHUB_JOBS, STACK_OVERFLOW
    };
  }

  /**
   * Get all API platforms
   */
  public static Platform[] getApiPlatforms() {
    return new Platform[]{
      LINKEDIN, INDEED, NAUKRI, FOUNDIT, SHINE, APNA
    };
  }
}
