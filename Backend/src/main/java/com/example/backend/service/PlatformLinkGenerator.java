package com.example.backend.service;

import com.example.backend.dto.SearchResponseDto.PlatformSearchCardDto;
import com.example.backend.model.Platform;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Universal, generic URL generator for all 18+ job platforms.
 * Handles ANY arbitrary keyword (tech, healthcare, accounting, design, engineering, etc.)
 * and dynamic locations without any hardcoded role branches.
 */
@Service
public class PlatformLinkGenerator {

    private static final Pattern KNOWN_CITIES_PATTERN = Pattern.compile(
        "(?i)\\b(mumbai|bengaluru|bangalore|pune|hyderabad|delhi|noida|gurugram|gurgaon|chennai|kolkata|ahmedabad|chandigarh|jaipur|indore|kochi|san francisco|new york|london|berlin|singapore|seattle|austin|chicago|toronto|sydney|dubai)\\b"
    );

    /**
     * Generate search URLs map for all platforms
     */
    public Map<String, String> generatePlatformLinks(String keyword, String location) {
        Map<String, String> links = new LinkedHashMap<>();
        String cleanKw = normalizeKeyword(keyword);
        String cleanLoc = extractCleanCity(location);

        for (Platform platform : Platform.values()) {
            String searchUrl = generateSearchUrl(platform, cleanKw, cleanLoc);
            links.put(platform.getDisplayName(), searchUrl);
        }

        return links;
    }

    /**
     * Generate structured PlatformSearchCardDto list for external discovery cards
     */
    public List<PlatformSearchCardDto> generatePlatformSearchCards(String keyword, String location) {
        List<PlatformSearchCardDto> cards = new ArrayList<>();
        String cleanKw = normalizeKeyword(keyword);
        String cleanLoc = extractCleanCity(location);

        for (Platform platform : Platform.values()) {
            String searchUrl = generateSearchUrl(platform, cleanKw, cleanLoc);
            cards.add(PlatformSearchCardDto.builder()
                    .platform(platform.name())
                    .displayName(platform.getDisplayName())
                    .searchUrl(searchUrl)
                    .description(platform.getDescription())
                    .icon(getPlatformIcon(platform))
                    .isApiPlatform(platform.isApiPlatform())
                    .targetKeyword(cleanKw)
                    .targetLocation(cleanLoc)
                    .build());
        }

        return cards;
    }

    /**
     * Generate precision direct apply / deep search URL for a specific Job record
     */
    public String generateJobApplyUrl(String source, String title, String company, String location) {
        Platform platform = Platform.fromString(source);
        String cleanTitle = cleanJobTitle(title);
        String cleanLoc = extractCleanCity(location);
        String query = (company != null && !company.isBlank()) ? company.trim() + " " + cleanTitle : cleanTitle;

        if (source != null && (source.equalsIgnoreCase("DIRECT") || source.equalsIgnoreCase("Corporate Verified")) && company != null && !company.isBlank()) {
            String encQuery = urlEncode(company.trim() + " " + cleanTitle);
            String encLoc = urlEncode(!cleanLoc.isBlank() ? cleanLoc : "India");
            return "https://www.linkedin.com/jobs/search/?keywords=" + encQuery + "&location=" + encLoc;
        }

        return generateSearchUrl(platform, query, cleanLoc);
    }

    /**
     * Generate platform-specific search URL with precision parameter formatting
     */
    public String generateSearchUrl(Platform platform, String rawKeyword, String rawLocation) {
        String cleanKw = normalizeKeyword(rawKeyword);
        String cityLoc = extractCleanCity(rawLocation);

        String encKeyword = urlEncode(cleanKw);
        String encLoc = urlEncode(cityLoc);
        String roleSlug = slugify(cleanKw);
        String locSlug = slugify(cityLoc);

        switch (platform) {
            case LINKEDIN:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.linkedin.com/jobs/search/?keywords=%s&location=%s", encKeyword, encLoc);
                }
                return String.format("https://www.linkedin.com/jobs/search/?keywords=%s&location=India", encKeyword);

            case INDEED:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.indeed.com/jobs?q=%s&l=%s", encKeyword, encLoc);
                }
                return String.format("https://www.indeed.com/jobs?q=%s", encKeyword);

            case NAUKRI:
                if (!locSlug.isBlank() && !locSlug.equals("jobs")) {
                    return String.format("https://www.naukri.com/jobs-in-%s?k=%s", locSlug, encKeyword);
                }
                return String.format("https://www.naukri.com/%s-jobs", roleSlug);

            case FOUNDIT:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.foundit.in/srp/results?query=%s&locations=%s", encKeyword, encLoc);
                }
                return String.format("https://www.foundit.in/srp/results?query=%s&locations=India", encKeyword);

            case SHINE:
                if (!locSlug.isBlank() && !locSlug.equals("jobs")) {
                    return String.format("https://www.shine.com/job-search/%s-jobs-in-%s", roleSlug, locSlug);
                }
                return String.format("https://www.shine.com/job-search/%s-jobs", roleSlug);

            case APNA:
                if (!cityLoc.isBlank()) {
                    return String.format("https://apna.co/jobs?text=%s&location=%s", encKeyword, encLoc);
                }
                return String.format("https://apna.co/jobs?text=%s", encKeyword);

            case WELLFOUND:
                return String.format("https://wellfound.com/jobs?query=%s", encKeyword);

            case GLASSDOOR:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=%s&locKeyword=%s", encKeyword, encLoc);
                }
                return String.format("https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=%s&locKeyword=India", encKeyword);

            case TIMESJOBS:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=%s&txtLocation=%s", encKeyword, encLoc);
                }
                return String.format("https://www.timesjobs.com/candidate/job-search.html?searchType=personalizedSearch&from=submit&txtKeywords=%s", encKeyword);

            case MONSTER:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.monster.com/jobs/search?q=%s&where=%s", encKeyword, encLoc);
                }
                return String.format("https://www.monster.com/jobs/search?q=%s", encKeyword);

            case SIMPLYHIRED:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.simplyhired.com/search?q=%s&l=%s", encKeyword, encLoc);
                }
                return String.format("https://www.simplyhired.com/search?q=%s", encKeyword);

            case INTERNSHALA:
                if (!locSlug.isBlank() && !locSlug.equals("jobs")) {
                    return String.format("https://internshala.com/internships/%s-internship-in-%s", roleSlug, locSlug);
                }
                return String.format("https://internshala.com/internships/keywords-%s", roleSlug);

            case UNSTOP:
                return String.format("https://unstop.com/jobs?searchTerm=%s", encKeyword);

            case REMOTIVE:
                return String.format("https://remotive.com/remote-jobs/search?query=%s", encKeyword);

            case ARBEITNOW:
                return String.format("https://www.arbeitnow.com/jobs?search=%s", encKeyword);

            case ADZUNA:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.adzuna.in/search?q=%s&w=%s", encKeyword, encLoc);
                }
                return String.format("https://www.adzuna.in/search?q=%s", encKeyword);

            case GOOGLE_JOBS:
                String gq = cleanKw;
                if (!cityLoc.isBlank()) gq += " jobs in " + cityLoc;
                else gq += " jobs";
                return String.format("https://www.google.com/search?q=%s&ibp=htl;jobs", urlEncode(gq));

            case USAJOBS:
                if (!cityLoc.isBlank()) {
                    return String.format("https://www.usajobs.gov/Search/Results?k=%s&l=%s", encKeyword, encLoc);
                }
                return String.format("https://www.usajobs.gov/Search/Results?k=%s", encKeyword);

            case HIMALAYAS:
                return String.format("https://himalayas.app/jobs?q=%s", encKeyword);

            case REMOTEOK:
                return String.format("https://remoteok.com/remote-%s-jobs", roleSlug);

            case GREENHOUSE:
                return "https://boards.greenhouse.io";

            case JOOBLE:
                if (!cityLoc.isBlank()) {
                    return String.format("https://jooble.org/SearchResult?ukw=%s&rg=%s", encKeyword, encLoc);
                }
                return String.format("https://jooble.org/SearchResult?ukw=%s", encKeyword);

            default:
                return platform.getBaseUrl();
        }
    }

    public String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.trim().isBlank()) {
            return "Software Engineer";
        }
        return keyword.trim().replaceAll("\\s+", " ");
    }

    public String cleanJobTitle(String title) {
        if (title == null || title.isBlank()) return "Software Engineer";
        return title.replaceAll("(?i)\\(.*?\\)", "").trim();
    }

    public String cleanCompany(String company) {
        if (company == null || company.isBlank()) return "";
        return company.replaceAll("(?i)\\(.*?\\)", "")
                .replaceAll("(?i)\\b(Pvt\\.?\\s*Ltd\\.?|Private\\s+Limited|Ltd\\.?|LLC|Inc\\.?|Corp\\.?)\\b", "")
                .replaceAll("(?i)\\b(&\\s*)?Co\\b\\.?", "")
                .replaceAll("[.,\\s]+$", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public String extractCleanCity(String location) {
        if (location == null || location.isBlank()) return "";

        Matcher matcher = KNOWN_CITIES_PATTERN.matcher(location);
        if (matcher.find()) {
            String found = matcher.group(1).toLowerCase();
            return Character.toUpperCase(found.charAt(0)) + found.substring(1);
        }

        // Fallback cleanup
        String cleaned = location
                .replaceAll("(?i)Hybrid\\s*-\\s*", "")
                .replaceAll("(?i)Work\\s+From\\s+Home\\s*", "")
                .replaceAll("(?i)Remote\\s*/\\s*", "")
                .replaceAll("(?i)Pan-India", "")
                .replaceAll("(?i)India", "")
                .replaceAll("(?i)Global", "")
                .replaceAll("(?i)Worldwide", "")
                .replaceAll("(?i)Telecommute", "")
                .replaceAll("[^a-zA-Z\\s]", "")
                .trim();

        return cleaned;
    }

    private String getPlatformIcon(Platform platform) {
        switch (platform) {
            case LINKEDIN: return "💼";
            case INDEED: return "🔍";
            case NAUKRI: return "📋";
            case FOUNDIT: return "🎯";
            case SHINE: return "✨";
            case APNA: return "🤝";
            case WELLFOUND: return "🚀";
            case GLASSDOOR: return "🏢";
            case TIMESJOBS: return "📰";
            case MONSTER: return "👹";
            case SIMPLYHIRED: return "⚡";
            case INTERNSHALA: return "🎓";
            case UNSTOP: return "🏆";
            case GOOGLE_JOBS: return "🌐";
            case REMOTIVE: return "🌍";
            case ARBEITNOW: return "💻";
            case ADZUNA: return "📊";
            case USAJOBS: return "🏛️";
            default: return "💼";
        }
    }

    public String urlEncode(String text) {
        if (text == null) return "";
        return URLEncoder.encode(text, StandardCharsets.UTF_8).replace("+", "%20");
    }

    public String slugify(String text) {
        if (text == null || text.isBlank()) return "jobs";
        String slug = text.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isBlank() ? "jobs" : slug;
    }
}
