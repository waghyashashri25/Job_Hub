package com.example.backend.model;

import lombok.Getter;

/**
 * Enum defining all supported job platforms across JobHub
 * Includes both API-supported and dynamic redirect search platforms
 */
@Getter
public enum Platform {
  // API-Supported Platforms (actual live job aggregation)
  REMOTIVE("Remotive", "https://remotive.com", true, "Remote tech, development & engineering jobs worldwide"),
  ADZUNA("Adzuna", "https://www.adzuna.com", true, "Smart job search engine with comprehensive salary data"),
  JSEARCH("JSearch", "https://jsearch.p.rapidapi.com", true, "Aggregator of millions of jobs across global boards"),
  USAJOBS("USAJOBS", "https://www.usajobs.gov", true, "Official US government and public sector job board"),
  ARBEITNOW("Arbeitnow", "https://www.arbeitnow.com", true, "Tech, engineering & remote visa-sponsored jobs"),
  HIMALAYAS("Himalayas", "https://himalayas.app", true, "Remote tech, engineering, sales & marketing opportunities"),
  REMOTEOK("RemoteOK", "https://remoteok.com", true, "Global remote developer, customer support & creative jobs"),
  GREENHOUSE("Greenhouse ATS", "https://boards.greenhouse.io", true, "Direct authentic corporate opportunities from top tech companies"),
  JOOBLE("Jooble", "https://jooble.org", true, "Comprehensive local and multi-industry job search aggregator"),

  // Dynamic Search Deep-Link Supported Platforms
  LINKEDIN("LinkedIn", "https://www.linkedin.com/jobs/search", false, "Professional network with over 20M+ active opportunities"),
  INDEED("Indeed", "https://www.indeed.com/jobs", false, "World's largest job search aggregator"),
  NAUKRI("Naukri", "https://www.naukri.com", false, "India's premier tech and professional hiring destination"),
  FOUNDIT("Foundit", "https://www.foundit.in/srp/results", false, "Formerly Monster APAC, connecting talent with top enterprises"),
  SHINE("Shine", "https://www.shine.com/job-search", false, "India's fast-growing talent and job discovery portal"),
  APNA("Apna", "https://apna.co/jobs", false, "Community-driven job platform across India"),
  WELLFOUND("Wellfound", "https://wellfound.com/jobs", false, "The #1 startup and venture talent hiring platform"),
  GLASSDOOR("Glassdoor", "https://www.glassdoor.com/Job/jobs.htm", false, "Company reviews, salaries, interview questions & jobs"),
  TIMESJOBS("TimesJobs", "https://www.timesjobs.com/candidate/job-search.html", false, "Leading corporate and tech hiring network"),
  MONSTER("Monster", "https://www.monster.com/jobs/search", false, "Global career board for high-impact opportunities"),
  SIMPLYHIRED("SimplyHired", "https://www.simplyhired.com/search", false, "Simple, fast multi-board job discovery"),
  INTERNSHALA("Internshala", "https://internshala.com/internships", false, "Premier internships and fresh graduate engineering roles"),
  GOOGLE_JOBS("Google Jobs", "https://www.google.com/search?ibp=htl;jobs", false, "Aggregate listings from corporate career pages and job boards"),
  UNSTOP("Unstop", "https://unstop.com/jobs", false, "Competitions, hackathons, tech internships & hiring challenges");

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

  public static Platform fromString(String name) {
    if (name == null || name.isBlank()) return LINKEDIN;
    String clean = name.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
    for (Platform p : Platform.values()) {
      if (p.name().toLowerCase().equals(clean) || 
          p.getDisplayName().toLowerCase().replaceAll("[^a-z0-9]", "").equals(clean)) {
        return p;
      }
    }
    return LINKEDIN;
  }

  public static Platform[] getNonApiPlatforms() {
    return new Platform[]{
      LINKEDIN, INDEED, NAUKRI, FOUNDIT, SHINE, APNA, WELLFOUND,
      GLASSDOOR, TIMESJOBS, MONSTER, SIMPLYHIRED, INTERNSHALA, UNSTOP, GOOGLE_JOBS
    };
  }

  public static Platform[] getApiPlatforms() {
    return new Platform[]{
      REMOTIVE, ADZUNA, JSEARCH, USAJOBS, ARBEITNOW
    };
  }
}
