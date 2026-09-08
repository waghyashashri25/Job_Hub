package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobMatchAnalysisDto {

    private Long jobId;
    private String jobTitle;
    private String company;
    private String location;
    private String source;
    private String applyLink;

    private int overallMatchPercentage;   // 0 - 100%
    private int skillMatchPercentage;     // 0 - 100%
    private int experienceMatchPercentage;// 0 - 100%
    private int interviewProbability;     // 0 - 100%
    private String matchConfidence;       // "High", "Medium", "Moderate", "Low"
    private String matchConfidenceColor;  // Hex color code

    @Builder.Default
    private List<String> matchedSkills = new ArrayList<>();

    @Builder.Default
    private List<String> missingCriticalSkills = new ArrayList<>();

    @Builder.Default
    private List<String> missingPreferredSkills = new ArrayList<>();

    @Builder.Default
    private List<LearningRecommendation> learningRecommendations = new ArrayList<>();

    @Builder.Default
    private List<InterviewQuestion> interviewPrepQuestions = new ArrayList<>();

    private String matchSummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningRecommendation {
        private String skill;
        private String category;
        private String estimatedTimeToLearn;
        private String resourceTitle;
        private String resourceLink;
        private String importance; // "Critical", "Recommended"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterviewQuestion {
        private String topic;
        private String question;
        private String difficulty; // "Easy", "Medium", "Hard"
        private String sampleAnswerGuideline;
    }
}
