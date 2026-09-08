package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeDataDto {

    private String rawText;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateLocation;
    private String candidateSummary;
    private String suggestedJobTitle;
    private Integer totalExperienceYears;

    @Builder.Default
    private List<String> allSkills = new ArrayList<>();

    @Builder.Default
    private Map<String, List<String>> categorizedSkills = Map.of();

    @Builder.Default
    private List<ExperienceItem> experienceList = new ArrayList<>();

    @Builder.Default
    private List<ProjectItem> projectList = new ArrayList<>();

    @Builder.Default
    private List<EducationItem> educationList = new ArrayList<>();

    @Builder.Default
    private List<String> certifications = new ArrayList<>();

    private AtsScoreDetails atsEvaluation;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExperienceItem {
        private String role;
        private String company;
        private String duration;
        private String description;
        @Builder.Default
        private List<String> highlights = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectItem {
        private String title;
        private String description;
        @Builder.Default
        private List<String> technologies = new ArrayList<>();
        private String link;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EducationItem {
        private String degree;
        private String institution;
        private String year;
        private String gpaOrGrade;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AtsScoreDetails {
        private int overallScore; // 0-100
        private int skillsScore;  // 0-100
        private int experienceScore; // 0-100
        private int formattingScore; // 0-100
        private int brevityAndImpactScore; // 0-100
        private String atsRating; // "Excellent", "Good", "Needs Improvement"
        @Builder.Default
        private List<String> strengths = new ArrayList<>();
        @Builder.Default
        private List<String> improvements = new ArrayList<>();
        @Builder.Default
        private List<String> detectedSections = new ArrayList<>();
        @Builder.Default
        private List<String> missingSections = new ArrayList<>();
    }
}
