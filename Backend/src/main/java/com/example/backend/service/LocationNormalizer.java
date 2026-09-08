package com.example.backend.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Centralized Location Normalization and Precision Matching Engine
 * Handles arbitrary city names, regional aliases, state/country qualifiers,
 * and enforces strict geographical boundaries (preventing false positive cross-city matching).
 */
@Service
public class LocationNormalizer {

    // Common city alias mappings (canonical lowercase name -> recognized variations/aliases)
    private static final Map<String, List<String>> CITY_ALIASES = new HashMap<>();

    // Known distinct major global & Indian tech hubs (used to prevent cross-city bleed)
    private static final Set<String> MAJOR_DISTINCT_CITIES = new HashSet<>(Arrays.asList(
            "mumbai", "bombay", "navi mumbai", "thane",
            "pune",
            "bengaluru", "bangalore",
            "hyderabad", "secunderabad",
            "delhi", "new delhi", "noida", "gurugram", "gurgaon", "faridabad", "ghaziabad",
            "chennai", "madras",
            "kolkata", "calcutta",
            "ahmedabad", "gandhinagar",
            "chandigarh", "mohali", "panchkula",
            "jaipur", "indore", "kochi", "cochin", "thiruvananthapuram", "trivandrum",
            "san francisco", "sf bay area", "san jose", "mountain view", "sunnyvale", "palo alto", "oakland",
            "new york", "nyc", "manhattan", "brooklyn",
            "seattle", "redmond", "bellevue",
            "austin", "chicago", "boston", "los angeles", "los gatos",
            "london", "berlin", "munich", "amsterdam", "dublin", "paris", "toronto", "vancouver", "sydney", "singapore", "dubai"
    ));

    static {
        // Mumbai & MMR Region
        CITY_ALIASES.put("mumbai", Arrays.asList("mumbai", "bombay", "navi mumbai", "thane", "mumbai city", "mumbai suburban", "mmr", "mumbai metropolitan region", "andheri", "bandra", "powai", "worli", "bkc"));
        CITY_ALIASES.put("navi mumbai", Arrays.asList("navi mumbai", "vashi", "belapur", "nerul", "kharghar", "mumbai"));
        CITY_ALIASES.put("pune", Arrays.asList("pune", "poona", "hinjewadi", "magarpatta", "pcmc", "pimpri-chinchwad", "hadapsar", "baner", "wakad"));
        CITY_ALIASES.put("bengaluru", Arrays.asList("bengaluru", "bangalore", "whitefield", "electronic city", "koramangala", "indiranagar", "marathahalli", "bellandur", "hebbal"));
        CITY_ALIASES.put("bangalore", Arrays.asList("bengaluru", "bangalore", "whitefield", "electronic city", "koramangala", "indiranagar", "marathahalli", "bellandur", "hebbal"));
        CITY_ALIASES.put("hyderabad", Arrays.asList("hyderabad", "secunderabad", "hitech city", "gachibowli", "cyberabad", "madhapur", "kondapur", "kukatpally"));
        CITY_ALIASES.put("delhi", Arrays.asList("delhi", "new delhi", "noida", "greater noida", "gurugram", "gurgaon", "faridabad", "ghaziabad", "ncr", "delhi ncr"));
        CITY_ALIASES.put("noida", Arrays.asList("noida", "greater noida", "delhi ncr", "delhi", "new delhi"));
        CITY_ALIASES.put("gurugram", Arrays.asList("gurugram", "gurgaon", "cyber city", "delhi ncr", "delhi", "new delhi"));
        CITY_ALIASES.put("gurgaon", Arrays.asList("gurugram", "gurgaon", "cyber city", "delhi ncr", "delhi", "new delhi"));
        CITY_ALIASES.put("chennai", Arrays.asList("chennai", "madras", "omr", "guindy", "t nagar", "sholinganallur", "velachery"));
        CITY_ALIASES.put("kolkata", Arrays.asList("kolkata", "calcutta", "salt lake", "new town", "sector v", "howrah"));
        CITY_ALIASES.put("gujarat", Arrays.asList("gujarat", "gujrat", "ahmedabad", "surat", "vadodara", "rajkot", "gandhinagar", "gift city", "bhavnagar", "jamnagar"));
        CITY_ALIASES.put("gujrat", Arrays.asList("gujarat", "gujrat", "ahmedabad", "surat", "vadodara", "rajkot", "gandhinagar", "gift city"));
        CITY_ALIASES.put("rajasthan", Arrays.asList("rajasthan", "jaipur", "udaipur", "jodhpur", "kota", "ajmer", "bikaner", "alwar"));
        CITY_ALIASES.put("madhya pradesh", Arrays.asList("madhya pradesh", "mp", "indore", "bhopal", "gwalior", "jabalpur", "ujjain"));
        CITY_ALIASES.put("uttar pradesh", Arrays.asList("uttar pradesh", "up", "lucknow", "kanpur", "noida", "greater noida", "varanasi", "agra", "prayagraj", "allahabad", "ghaziabad", "bareilly", "aligarh", "meerut", "rampur", "shahabad"));
        CITY_ALIASES.put("maharashtra", Arrays.asList("maharashtra", "mh", "mumbai", "pune", "nagpur", "nashik", "aurangabad", "satara", "solapur", "kolhapur", "thane", "navi mumbai", "sangli", "amravati", "nanded", "jalgaon"));
        CITY_ALIASES.put("satara", Arrays.asList("satara", "maharashtra"));
        CITY_ALIASES.put("goa", Arrays.asList("goa", "panaji", "margao", "vasco", "mapusa"));
        CITY_ALIASES.put("san francisco", Arrays.asList("san francisco", "sf", "san francisco bay area", "sf bay area", "silicon valley"));
        CITY_ALIASES.put("new york", Arrays.asList("new york", "nyc", "new york city", "ny", "manhattan", "brooklyn"));
        CITY_ALIASES.put("seattle", Arrays.asList("seattle", "redmond", "bellevue", "greater seattle"));
    }

    public static final Set<String> INDIAN_STATES = new HashSet<>(Arrays.asList(
            "maharashtra", "mh", "karnataka", "ka", "telangana", "ts", "tamil nadu", "tamilnadu", "tn", "haryana", "hr",
            "uttar pradesh", "up", "gujarat", "gj", "kerala", "kl", "rajasthan", "rj", "madhya pradesh", "mp",
            "west bengal", "wb", "punjab", "pb", "andhra pradesh", "ap", "bihar", "br", "odisha", "orissa", "or",
            "assam", "as", "jharkhand", "jh", "chhattisgarh", "cg", "uttarakhand", "uk", "himachal pradesh", "hp",
            "goa", "ga", "delhi", "delhi ncr", "dl", "chandigarh", "ch", "jammu and kashmir", "j&k", "jk",
            "puducherry", "pondicherry", "py", "tripura", "manipur", "meghalaya", "nagaland", "mizoram", "sikkim", "arunachal pradesh", "ladakh"
    ));

    public static final Set<String> INDIAN_CITIES_SET = new HashSet<>(Arrays.asList(
            "mumbai", "bombay", "navi mumbai", "thane", "pune", "poona", "hinjewadi", "magarpatta",
            "bengaluru", "bangalore", "whitefield", "electronic city", "koramangala", "indiranagar",
            "hyderabad", "secunderabad", "hitech city", "gachibowli", "cyberabad", "madhapur", "kondapur",
            "delhi", "new delhi", "noida", "greater noida", "gurugram", "gurgaon", "faridabad", "ghaziabad",
            "chennai", "madras", "omr", "guindy", "kolkata", "calcutta", "salt lake", "new town",
            "ahmedabad", "gandhinagar", "gift city", "chandigarh", "mohali", "panchkula",
            "jaipur", "indore", "kochi", "cochin", "thiruvananthapuram", "trivandrum",
            "coimbatore", "nagpur", "surat", "vadodara", "bhopal", "visakhapatnam", "vizag",
            "mysore", "mysuru", "mangalore", "lucknow", "kanpur", "patna", "bhubaneswar",
            "nashik", "aurangabad", "rajkot", "ranchi", "guwahati", "dehradun",
            "satara", "solapur", "kolhapur", "sangli", "amravati", "nanded", "jalgaon", "akola", "latur", "dhule", "ahmednagar",
            "udaipur", "jodhpur", "kota", "bikaner", "ajmer", "gwalior", "jabalpur", "ujjain",
            "varanasi", "agra", "prayagraj", "allahabad", "meerut", "aligarh", "bareilly", "moradabad",
            "bhavnagar", "jamnagar", "panaji", "margao", "vasco", "goa", "dhanbad", "jamshedpur", "cuttack", "rourkela",
            "rampur", "shahabad", "haridwar", "roorkee", "ludhiana", "amritsar", "jalandhar", "patiala",
            "tirupati", "vijayawada", "guntur", "nellore", "kurnool", "warangal", "hubli", "dharwad", "belgaum"
    ));

    /**
     * Clean and normalize raw input string
     */
    public String normalize(String raw) {
        if (raw == null) return "";
        return raw.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    /**
     * Extract the canonical primary city from a search query or job location string
     */
    public String extractPrimaryCity(String locationStr) {
        if (locationStr == null || locationStr.isBlank()) return "";
        String norm = normalize(locationStr);

        for (Map.Entry<String, List<String>> entry : CITY_ALIASES.entrySet()) {
            for (String alias : entry.getValue()) {
                if (containsWord(norm, alias)) {
                    return entry.getKey();
                }
            }
        }

        // Return first comma-separated token if not in known map
        String[] parts = norm.split("[,/\\-|()]");
        if (parts.length > 0 && !parts[0].trim().isBlank()) {
            return parts[0].trim();
        }
        return norm;
    }

    /**
     * Determine if a user's location query is explicitly requesting remote/work-from-home
     */
    public boolean isExplicitRemoteQuery(String searchLoc) {
        if (searchLoc == null || searchLoc.isBlank()) return false;
        String norm = normalize(searchLoc);
        return norm.contains("remote") || norm.contains("wfh") || norm.contains("work from home") || norm.contains("virtual") || norm.contains("telecommute");
    }

    /**
     * Core matching policy:
     * Evaluates whether a job's location matches the user's searched location.
     */
    public boolean matchesLocation(String jobLocationRaw, String searchLocationRaw) {
        if (searchLocationRaw == null || searchLocationRaw.isBlank()) {
            return true; // No location filter applied (match all)
        }

        String searchLocNorm = normalize(searchLocationRaw);
        String jobLocNorm = normalize(jobLocationRaw);

        if (jobLocNorm.isBlank()) {
            return false;
        }

        // Case 0: User searched Worldwide / Global / Everywhere / All
        if (isWorldwideQuery(searchLocNorm)) {
            return true;
        }

        // Case 1: User explicitly searched for Remote / WFH
        if (isExplicitRemoteQuery(searchLocNorm)) {
            return isRemoteJob(jobLocNorm);
        }

        // Case 2: User searched All India / Pan-India / India
        if (isAllIndiaQuery(searchLocNorm)) {
            return isIndianJob(jobLocNorm);
        }

        // Case 3: User searched a specific city or region
        String targetCity = extractPrimaryCity(searchLocNorm);
        List<String> validAliases = CITY_ALIASES.getOrDefault(targetCity, Collections.singletonList(targetCity));

        // Check if job location matches any alias of the target city
        for (String alias : validAliases) {
            if (containsWord(jobLocNorm, alias)) {
                return true;
            }
        }

        // Check for exact substring match if alias not found
        if (containsWord(jobLocNorm, searchLocNorm)) {
            return true;
        }

        // Check if searchLoc is a broad country (e.g. "India", "United States", "USA", "UK", "Germany")
        if (isCountrySearch(searchLocNorm, jobLocNorm)) {
            return true;
        }

        return false;
    }

    /**
     * Check if user is searching worldwide / globally
     */
    public boolean isWorldwideQuery(String searchLoc) {
        if (searchLoc == null || searchLoc.isBlank()) return true;
        String norm = normalize(searchLoc);
        if (norm.contains("india") || norm.contains("bharat")) return false; // India is distinct from worldwide
        return norm.contains("world") || norm.contains("global") || norm.contains("globe") || 
               norm.contains("everywhere") || norm.contains("anywhere") || norm.contains("international") || 
               norm.contains("any location") || norm.contains("all location") ||
               norm.contains("all over the world") || norm.contains("all over world") ||
               norm.equals("all over") || norm.equals("all") || norm.equals("any");
    }

    /**
     * Check if user is searching all across India
     */
    public boolean isAllIndiaQuery(String searchLoc) {
        if (searchLoc == null || searchLoc.isBlank()) return false;
        String norm = normalize(searchLoc);
        return norm.contains("india") || norm.contains("pan india") || norm.contains("pan-india") || 
               norm.equals("in") || norm.contains("all india") || norm.contains("bharat") ||
               norm.contains("across india") || norm.contains("anywhere in india") ||
               norm.contains("all over india");
    }

    /**
     * Check if a job is situated in India
     */
    public boolean isIndianJob(String jobLocNorm) {
        if (jobLocNorm == null || jobLocNorm.isBlank()) return false;
        if (jobLocNorm.contains("india") || jobLocNorm.contains("bharat")) return true;
        if (isIndianCity(jobLocNorm) || isIndianState(jobLocNorm) || isIndianCityAlias(jobLocNorm)) return true;
        return isRemoteJob(jobLocNorm);
    }

    public boolean isIndianState(String loc) {
        for (String state : INDIAN_STATES) {
            if (containsWord(loc, state)) return true;
        }
        return false;
    }

    public boolean isIndianCity(String loc) {
        for (String city : INDIAN_CITIES_SET) {
            if (containsWord(loc, city)) return true;
        }
        return false;
    }

    public boolean isIndianCityAlias(String loc) {
        for (Map.Entry<String, List<String>> entry : CITY_ALIASES.entrySet()) {
            if (INDIAN_CITIES_SET.contains(entry.getKey()) || INDIAN_STATES.contains(entry.getKey())) {
                for (String alias : entry.getValue()) {
                    if (containsWord(loc, alias)) return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if a job is strictly a remote opportunity
     */
    public boolean isRemoteJob(String jobLocNorm) {
        return jobLocNorm.contains("remote") ||
               jobLocNorm.contains("wfh") ||
               jobLocNorm.contains("work from home") ||
               jobLocNorm.contains("worldwide") ||
               jobLocNorm.contains("anywhere") ||
               jobLocNorm.contains("virtual");
    }

    /**
     * Checks if search is for a broad country and job is situated in that country
     */
    private boolean isCountrySearch(String searchLocNorm, String jobLocNorm) {
        if ((searchLocNorm.contains("india") || searchLocNorm.equals("in")) && isIndianJob(jobLocNorm)) {
            return true;
        }
        if ((searchLocNorm.equals("usa") || searchLocNorm.equals("united states") || searchLocNorm.equals("us") || searchLocNorm.contains("america")) &&
                (jobLocNorm.contains("united states") || jobLocNorm.contains("usa") || jobLocNorm.contains("us") || jobLocNorm.contains("ca") || jobLocNorm.contains("ny") || jobLocNorm.contains("tx") || jobLocNorm.contains("wa"))) {
            return true;
        }
        if ((searchLocNorm.equals("uk") || searchLocNorm.equals("united kingdom") || searchLocNorm.contains("britain")) &&
                (jobLocNorm.contains("uk") || jobLocNorm.contains("united kingdom") || jobLocNorm.contains("london") || jobLocNorm.contains("england") || jobLocNorm.contains("scotland"))) {
            return true;
        }
        if ((searchLocNorm.equals("germany") || searchLocNorm.contains("deutschland")) &&
                (jobLocNorm.contains("germany") || jobLocNorm.contains("berlin") || jobLocNorm.contains("munich") || jobLocNorm.contains("frankfurt") || jobLocNorm.contains("hamburg"))) {
            return true;
        }
        if (searchLocNorm.equals("canada") && (jobLocNorm.contains("canada") || jobLocNorm.contains("toronto") || jobLocNorm.contains("vancouver") || jobLocNorm.contains("montreal") || jobLocNorm.contains("ontario") || jobLocNorm.contains("bc"))) {
            return true;
        }
        if (searchLocNorm.equals("australia") && (jobLocNorm.contains("australia") || jobLocNorm.contains("sydney") || jobLocNorm.contains("melbourne") || jobLocNorm.contains("brisbane"))) {
            return true;
        }
        if (searchLocNorm.equals("singapore") && jobLocNorm.contains("singapore")) {
            return true;
        }
        if ((searchLocNorm.equals("uae") || searchLocNorm.equals("dubai")) && (jobLocNorm.contains("uae") || jobLocNorm.contains("dubai") || jobLocNorm.contains("abu dhabi"))) {
            return true;
        }
        return false;
    }

    /**
     * Fast token and word boundary matching without repeated regex overhead
     */
    private boolean containsWord(String source, String target) {
        if (source == null || target == null || target.isBlank()) return false;
        int sLen = source.length();
        int tLen = target.length();
        if (tLen > sLen) return false;

        int idx = 0;
        while ((idx = source.indexOf(target, idx)) != -1) {
            boolean startBoundary = (idx == 0) || !Character.isLetterOrDigit(source.charAt(idx - 1));
            boolean endBoundary = (idx + tLen == sLen) || !Character.isLetterOrDigit(source.charAt(idx + tLen));
            if (startBoundary && endBoundary) {
                return true;
            }
            idx += 1;
        }
        return false;
    }
}
