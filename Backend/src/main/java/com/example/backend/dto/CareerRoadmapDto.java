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
public class CareerRoadmapDto {

    private String currentRole;
    private String targetRole;
    private Integer currentExperienceYears;
    private String estimatedTimeToTarget; // e.g. "6-12 Months"
    private String readinessScore; // e.g. "72%"

    @Builder.Default
    private List<RoadmapStage> stages = new ArrayList<>();

    @Builder.Default
    private List<ProjectIdea> recommendedProjects = new ArrayList<>();

    private SalaryBenchmark salaryBenchmark;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoadmapStage {
        private int stageNumber;
        private String stageTitle;
        private String timeFrame;
        private String description;
        @Builder.Default
        private List<String> skillsToMaster = new ArrayList<>();
        @Builder.Default
        private List<String> actionItems = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectIdea {
        private String title;
        private String description;
        @Builder.Default
        private List<String> techStack = new ArrayList<>();
        private String difficulty; // "Intermediate", "Advanced"
        private String industryValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalaryBenchmark {
        private String currency;
        private double minSalary;
        private double medianSalary;
        private double maxSalary;
        private String locationFactor;
        @Builder.Default
        private List<String> highValueSkills = new ArrayList<>();
        @Builder.Default
        private List<CompanyTierBenchmark> tiers = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyTierBenchmark {
        private String tierName;        // "Service & IT", "Product Startup", "Dream Companies", "Super Dream"
        private String badge;           // "SERVICE", "STARTUP", "DREAM", "SUPER DREAM"
        private double minSalary;
        private double medianSalary;
        private double maxSalary;
        private String monthlyStipend;  // e.g. "₹15,000 - ₹25,000 / mo"
        private String description;
        @Builder.Default
        private List<String> exampleCompanies = new ArrayList<>();
    }
}
