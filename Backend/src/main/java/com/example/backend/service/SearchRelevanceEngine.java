package com.example.backend.service;

import com.example.backend.model.Job;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Domain-Agnostic Strict Search Relevance Engine
 * 
 * Enforces:
 * 1. Title-First Role Matching: A job must match the searched role in its TITLE.
 * 2. Internship Isolation: Internships are strictly excluded from regular job searches unless explicitly searched.
 * 3. Domain & Profession Separation: Rejects cross-domain false positives (e.g. Data Analyst for Python Developer).
 * 4. Elimination of Description Skill-Bleed.
 */
@Service
public class SearchRelevanceEngine {

    // Common generic role nouns that often pair with qualifiers
    private static final Set<String> GENERIC_ROLE_NOUNS = new HashSet<>(Arrays.asList(
            "developer", "engineer", "programmer", "architect", "lead", "specialist", "consultant",
            "manager", "analyst", "designer", "officer", "executive", "associate", "intern", "internship",
            "trainee", "fresher", "technician", "assistant", "director", "administrator", "scientist", "tester", "qa", "sde"
    ));

    // Competing tech / domain qualifiers
    private static final Set<String> TECH_DOMAIN_QUALIFIERS = new HashSet<>(Arrays.asList(
            "java", "python", "javascript", "typescript", "react", "angular", "vue", "node", "nodejs",
            "golang", "go", "rust", "c++", "cpp", "c#", "dotnet", ".net", "php", "ruby", "rails",
            "swift", "kotlin", "flutter", "react native", "devops", "cloud", "aws", "azure", "gcp",
            "data science", "machine learning", "ai", "deep learning", "cybersecurity", "security"
    ));

    // Distinct non-tech professions
    private static final Map<String, List<String>> DISTINCT_PROFESSIONS = new HashMap<>();
    static {
        DISTINCT_PROFESSIONS.put("accountant", Arrays.asList("accountant", "accounting", "auditor", "tax", "chartered accountant", "finance"));
        DISTINCT_PROFESSIONS.put("nurse", Arrays.asList("nurse", "nursing", "medical", "clinical", "healthcare", "patient care"));
        DISTINCT_PROFESSIONS.put("civil", Arrays.asList("civil", "structural", "construction", "site engineer"));
        DISTINCT_PROFESSIONS.put("hr", Arrays.asList("hr", "human resources", "recruiter", "talent acquisition", "hrbp"));
        DISTINCT_PROFESSIONS.put("designer", Arrays.asList("designer", "ui", "ux", "ui/ux", "product design", "graphic"));
        DISTINCT_PROFESSIONS.put("analyst", Arrays.asList("data analyst", "business analyst", "analytics", "bi analyst"));
        DISTINCT_PROFESSIONS.put("marketing", Arrays.asList("marketing", "digital marketing", "seo", "sem", "growth"));
    }

    public enum RelevanceTier {
        TIER_1_EXACT_MATCH("Exact Title Match", 100),
        TIER_2_STRONG_MATCH("Strong Title Match", 85),
        TIER_3_RELATED_ROLE("Related Role Match", 70),
        TIER_0_REJECTED("Irrelevant / Conflicting Domain", 0);

        private final String displayName;
        private final int baseScore;

        RelevanceTier(String displayName, int baseScore) {
            this.displayName = displayName;
            this.baseScore = baseScore;
        }

        public String getDisplayName() { return displayName; }
        public int getBaseScore() { return baseScore; }
    }

    public static class EvaluationResult {
        private final boolean relevant;
        private final RelevanceTier tier;
        private final int score;
        private final String matchReason;

        public EvaluationResult(boolean relevant, RelevanceTier tier, int score, String matchReason) {
            this.relevant = relevant;
            this.tier = tier;
            this.score = score;
            this.matchReason = matchReason;
        }

        public boolean isRelevant() { return relevant; }
        public RelevanceTier getTier() { return tier; }
        public int getScore() { return score; }
        public String getMatchReason() { return matchReason; }
    }

    /**
     * Checks if a job is an internship / trainee role
     */
    public boolean isInternshipJob(String title, String desc, String source) {
        String t = title != null ? title.toLowerCase() : "";
        String s = source != null ? source.toLowerCase() : "";
        return t.contains("intern") || t.contains("internship") || t.contains("trainee") || 
               t.contains("apprentice") || t.contains("fellowship") || 
               s.equals("internshala") || s.equals("unstop");
    }

    /**
     * Evaluate relevance of a Job against a user keyword and location query
     */
    public EvaluationResult evaluateJob(Job job, String searchKeyword, String searchLocation) {
        if (job == null) {
            return new EvaluationResult(false, RelevanceTier.TIER_0_REJECTED, 0, "Null job");
        }

        String rawKw = searchKeyword != null ? searchKeyword.trim().toLowerCase() : "";
        String title = job.getTitle() != null ? job.getTitle().trim().toLowerCase() : "";
        String desc = job.getDescription() != null ? job.getDescription().trim().toLowerCase() : "";
        String comp = job.getCompany() != null ? job.getCompany().trim().toLowerCase() : "";
        String source = job.getSource() != null ? job.getSource().trim().toLowerCase() : "";

        // 1. Internship Policy:
        // If user is searching regular jobs (not explicitly requesting internships), NEVER return an internship
        boolean queryIsInternship = rawKw.contains("intern") || rawKw.contains("internship") || rawKw.contains("trainee") || rawKw.contains("fellow") || rawKw.contains("apprentice");
        boolean jobIsInternship = isInternshipJob(title, desc, source);

        if (!queryIsInternship && jobIsInternship) {
            return new EvaluationResult(false, RelevanceTier.TIER_0_REJECTED, 0, "Internship position excluded from regular job feed");
        }

        // If user explicitly searched for internship, non-internships are rejected
        if (queryIsInternship && !jobIsInternship) {
            return new EvaluationResult(false, RelevanceTier.TIER_0_REJECTED, 0, "Non-internship job excluded from internship search");
        }

        // 2. Broad search (no keyword specified)
        if (rawKw.isBlank()) {
            return new EvaluationResult(true, RelevanceTier.TIER_1_EXACT_MATCH, 50, "Broad search (no keyword specified)");
        }

        List<String> queryTokens = Arrays.stream(rawKw.split("\\s+"))
                .filter(t -> !t.isBlank())
                .collect(Collectors.toList());

        // Extract primary qualifiers (non-generic nouns)
        List<String> qualifiers = queryTokens.stream()
                .filter(t -> !GENERIC_ROLE_NOUNS.contains(t))
                .collect(Collectors.toList());

        // 3. Reject Conflicting Domains / Professions
        if (hasConflictingDomainOrProfession(title, rawKw, queryTokens, qualifiers)) {
            return new EvaluationResult(false, RelevanceTier.TIER_0_REJECTED, 0, "Conflicting primary domain or profession in job title");
        }

        // 4. Exact Title Match
        if (title.equals(rawKw)) {
            return new EvaluationResult(true, RelevanceTier.TIER_1_EXACT_MATCH, 100, "Exact title match");
        }

        // 5. Strong Title Match (Title contains the entire query phrase)
        if (title.contains(rawKw)) {
            return new EvaluationResult(true, RelevanceTier.TIER_2_STRONG_MATCH, 90, "Full keyword phrase contained in title");
        }

        // 6. Role Stem / Alias Match (e.g. "internship" -> "intern", "ui/ux" -> "ui/ux designer", "devops" -> "sre")
        if (matchesRoleAlias(rawKw, title, desc)) {
            return new EvaluationResult(true, RelevanceTier.TIER_2_STRONG_MATCH, 85, "Role stem / domain alias matched in title");
        }

        // 7. All Query Tokens present in Title
        boolean allTokensInTitle = queryTokens.stream().allMatch(t -> containsWord(title, t) || matchesTokenAlias(t, title));
        if (allTokensInTitle) {
            return new EvaluationResult(true, RelevanceTier.TIER_2_STRONG_MATCH, 85, "All query terms present in title");
        }

        // 8. Primary Qualifier(s) in Title (e.g. "Java" in "Lead Java Software Engineer" for query "Java Developer")
        if (!qualifiers.isEmpty()) {
            boolean allQualifiersInTitle = qualifiers.stream().allMatch(q -> containsWord(title, q) || matchesTokenAlias(q, title));
            if (allQualifiersInTitle) {
                return new EvaluationResult(true, RelevanceTier.TIER_3_RELATED_ROLE, 70, "Primary domain qualifier present in title");
            }
        }

        // 9. Single-word query match in title (e.g. "Accountant", "Nurse", "Python", "React")
        if (queryTokens.size() == 1) {
            String singleToken = queryTokens.get(0);
            if (containsWord(title, singleToken) || matchesTokenAlias(singleToken, title)) {
                return new EvaluationResult(true, RelevanceTier.TIER_2_STRONG_MATCH, 80, "Single keyword present in title");
            }
        }

        // 10. Company name exact match (e.g. user searched "Google", "Infosys")
        if (containsWord(comp, rawKw)) {
            return new EvaluationResult(true, RelevanceTier.TIER_3_RELATED_ROLE, 65, "Company name match");
        }

        // STRICT POLICY: Do NOT accept matches based purely on description without title confirmation
        return new EvaluationResult(false, RelevanceTier.TIER_0_REJECTED, 0, "Job title does not match searched role");
    }

    /**
     * Checks if the job title belongs to a conflicting technology domain or different profession
     */
    private boolean hasConflictingDomainOrProfession(String title, String rawKw, List<String> queryTokens, List<String> qualifiers) {
        // Tech Domain Conflict Check (e.g. Query="python developer", Title="java developer")
        for (String q : qualifiers) {
            if (TECH_DOMAIN_QUALIFIERS.contains(q)) {
                if (!containsWord(title, q) && !matchesTokenAlias(q, title)) {
                    for (String otherTech : TECH_DOMAIN_QUALIFIERS) {
                        if (!otherTech.equals(q) && !queryTokens.contains(otherTech) && (containsWord(title, otherTech) || matchesTokenAlias(otherTech, title))) {
                            return true;
                        }
                    }
                }
            }
        }

        // Developer vs Analyst conflict (e.g. Query="python developer", Title="senior data analyst")
        boolean queryIsDeveloper = rawKw.contains("developer") || rawKw.contains("engineer") || rawKw.contains("programmer");
        boolean titleIsAnalystOnly = title.contains("analyst") && !title.contains("developer") && !title.contains("engineer");
        if (queryIsDeveloper && titleIsAnalystOnly) {
            return true;
        }

        // Profession Conflict Checks
        for (Map.Entry<String, List<String>> entry : DISTINCT_PROFESSIONS.entrySet()) {
            String profKey = entry.getKey();
            boolean queryIsProf = entry.getValue().stream().anyMatch(rawKw::contains);
            boolean titleIsProf = entry.getValue().stream().anyMatch(title::contains);

            if (queryIsProf && !titleIsProf) {
                // If query is for accountant, and title is developer/nurse/civil -> reject
                for (Map.Entry<String, List<String>> otherEntry : DISTINCT_PROFESSIONS.entrySet()) {
                    if (!otherEntry.getKey().equals(profKey)) {
                        if (otherEntry.getValue().stream().anyMatch(title::contains)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    private boolean matchesRoleAlias(String rawKw, String title, String desc) {
        if (rawKw.equals("internship") || rawKw.equals("intern")) {
            return containsWord(title, "intern") || containsWord(title, "internship") || containsWord(title, "trainee") || containsWord(title, "fellow");
        }
        if (rawKw.equals("fresher") || rawKw.equals("entry level")) {
            return containsWord(title, "fresher") || containsWord(title, "entry level") || containsWord(title, "graduate") || containsWord(title, "junior") || containsWord(title, "associate");
        }
        if (rawKw.contains("ui/ux") || rawKw.contains("ui ux") || rawKw.equals("designer") || rawKw.equals("product designer")) {
            return containsWord(title, "ui") || containsWord(title, "ux") || containsWord(title, "designer") || containsWord(title, "product design");
        }
        if (rawKw.equals("data analyst") || rawKw.equals("data science") || rawKw.equals("data engineer") || rawKw.equals("data analytics")) {
            return containsWord(title, "data") && (containsWord(title, "analyst") || containsWord(title, "scientist") || containsWord(title, "engineer") || containsWord(title, "analytics"));
        }
        if (rawKw.equals("product manager") || rawKw.equals("pm") || rawKw.equals("product management")) {
            return containsWord(title, "product manager") || containsWord(title, "product lead") || containsWord(title, "group product manager") || containsWord(title, "associate product manager");
        }
        if (rawKw.equals("qa") || rawKw.equals("qa automation") || rawKw.equals("testing") || rawKw.equals("software tester") || rawKw.equals("sdet")) {
            return containsWord(title, "qa") || containsWord(title, "quality") || containsWord(title, "sdet") || containsWord(title, "test") || containsWord(title, "tester");
        }
        if (rawKw.equals("devops") || rawKw.equals("sre") || rawKw.equals("cloud") || rawKw.equals("cloud engineer") || rawKw.equals("cloud architect")) {
            return containsWord(title, "devops") || containsWord(title, "sre") || containsWord(title, "site reliability") || containsWord(title, "cloud") || containsWord(title, "platform");
        }
        if (rawKw.contains("technical writing") || rawKw.contains("technical writer") || rawKw.contains("content writer") || rawKw.contains("content writing") || rawKw.contains("writer") || rawKw.contains("documentation")) {
            return (containsWord(title, "writer") || containsWord(title, "writing") || containsWord(title, "documentation") || containsWord(title, "content") || containsWord(title, "copywriter"));
        }
        if (rawKw.contains("cybersecurity") || rawKw.contains("security") || rawKw.contains("infosec")) {
            return containsWord(title, "security") || containsWord(title, "cybersecurity") || containsWord(title, "infosec") || containsWord(title, "soc");
        }
        if (rawKw.contains("sales") || rawKw.contains("business development") || rawKw.contains("bde")) {
            return containsWord(title, "sales") || containsWord(title, "business development") || containsWord(title, "bde") || containsWord(title, "account executive");
        }
        if (rawKw.contains("graphic") || rawKw.contains("visual designer") || rawKw.contains("motion designer")) {
            return containsWord(title, "graphic") || containsWord(title, "visual designer") || containsWord(title, "motion") || containsWord(title, "designer");
        }
        if (rawKw.contains("dba") || rawKw.contains("database administrator") || rawKw.contains("sql developer")) {
            return containsWord(title, "dba") || containsWord(title, "database") || containsWord(title, "sql");
        }
        return false;
    }

    private boolean matchesTokenAlias(String token, String targetText) {
        if (token.equals("react") || token.equals("reactjs")) {
            return containsWord(targetText, "react") || containsWord(targetText, "reactjs") || containsWord(targetText, "mern");
        }
        if (token.equals("internship") || token.equals("intern")) {
            return containsWord(targetText, "intern") || containsWord(targetText, "internship") || containsWord(targetText, "trainee");
        }
        if (token.equals("ui/ux") || token.equals("ui") || token.equals("ux")) {
            return containsWord(targetText, "ui") || containsWord(targetText, "ux") || containsWord(targetText, "designer");
        }
        if (token.equals("devops")) {
            return containsWord(targetText, "devops") || containsWord(targetText, "sre") || containsWord(targetText, "cloud") || containsWord(targetText, "platform");
        }
        if (token.equals("frontend") || token.equals("front-end")) {
            return containsWord(targetText, "frontend") || containsWord(targetText, "front-end") || containsWord(targetText, "ui developer");
        }
        if (token.equals("backend") || token.equals("back-end")) {
            return containsWord(targetText, "backend") || containsWord(targetText, "back-end");
        }
        if (token.equals("fullstack") || token.equals("full-stack")) {
            return containsWord(targetText, "full stack") || containsWord(targetText, "fullstack") || containsWord(targetText, "full-stack");
        }
        // Stemming & synonym support
        if (token.equals("writing") || token.equals("writer") || token.equals("write")) {
            return containsWord(targetText, "writer") || containsWord(targetText, "writing") || containsWord(targetText, "documentation") || containsWord(targetText, "author");
        }
        if (token.equals("technical") || token.equals("tech")) {
            return containsWord(targetText, "technical") || containsWord(targetText, "tech") || containsWord(targetText, "technology");
        }
        if (token.equals("security") || token.equals("cybersecurity") || token.equals("infosec")) {
            return containsWord(targetText, "security") || containsWord(targetText, "cybersecurity") || containsWord(targetText, "infosec") || containsWord(targetText, "soc");
        }
        if (token.equals("testing") || token.equals("tester") || token.equals("test") || token.equals("qa")) {
            return containsWord(targetText, "test") || containsWord(targetText, "tester") || containsWord(targetText, "testing") || containsWord(targetText, "qa") || containsWord(targetText, "sdet") || containsWord(targetText, "quality");
        }
        if (token.equals("developer") || token.equals("development") || token.equals("dev") || token.equals("programmer")) {
            return containsWord(targetText, "developer") || containsWord(targetText, "development") || containsWord(targetText, "engineer") || containsWord(targetText, "programmer");
        }
        if (token.equals("engineer") || token.equals("engineering")) {
            return containsWord(targetText, "engineer") || containsWord(targetText, "engineering") || containsWord(targetText, "developer");
        }
        if (token.equals("analytics") || token.equals("analyst") || token.equals("analyze")) {
            return containsWord(targetText, "analyst") || containsWord(targetText, "analytics") || containsWord(targetText, "analysis");
        }
        if (token.equals("manager") || token.equals("management") || token.equals("managing") || token.equals("lead")) {
            return containsWord(targetText, "manager") || containsWord(targetText, "management") || containsWord(targetText, "lead") || containsWord(targetText, "head");
        }
        if (token.equals("marketing") || token.equals("marketer")) {
            return containsWord(targetText, "marketing") || containsWord(targetText, "marketer") || containsWord(targetText, "growth");
        }
        if (token.equals("sales") || token.equals("selling")) {
            return containsWord(targetText, "sales") || containsWord(targetText, "business development") || containsWord(targetText, "bde") || containsWord(targetText, "account executive");
        }
        return false;
    }

    private boolean containsWord(String source, String target) {
        if (source == null || target == null || target.isBlank()) return false;
        return Pattern.compile("\\b" + Pattern.quote(target.trim()) + "\\b", Pattern.CASE_INSENSITIVE)
                .matcher(source)
                .find();
    }
}
