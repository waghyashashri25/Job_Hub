package com.example.backend.service;

import com.example.backend.dto.ResumeDataDto;
import com.example.backend.dto.ResumeDataDto.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ResumeParserService {

    private static final Logger logger = LoggerFactory.getLogger(ResumeParserService.class);

    // Knowledge Base of Technical and Domain Skills
    private static final Map<String, List<String>> SKILLS_TAXONOMY = new LinkedHashMap<>();

    static {
        SKILLS_TAXONOMY.put("Languages", List.of(
                "Java", "Python", "JavaScript", "TypeScript", "C++", "C#", "Go", "Golang", "Rust",
                "Kotlin", "Swift", "PHP", "Ruby", "SQL", "HTML", "HTML5", "CSS", "CSS3", "Bash", "Shell", "Scala", "R"
        ));
        SKILLS_TAXONOMY.put("Frameworks & Libraries", List.of(
                "Spring Boot", "Spring MVC", "Spring", "React", "React.js", "Angular", "Vue.js", "Vue",
                "Node.js", "Express.js", "Express", "Next.js", "NestJS", "Django", "Flask", "FastAPI",
                "ASP.NET", "Laravel", "Hibernate", "JPA", "Redux", "Tailwind CSS", "Bootstrap", "GraphQL", "REST API"
        ));
        SKILLS_TAXONOMY.put("Databases", List.of(
                "PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra", "Oracle", "SQLite",
                "DynamoDB", "Elasticsearch", "Neo4j", "Firebase", "Couchbase"
        ));
        SKILLS_TAXONOMY.put("Cloud & DevOps", List.of(
                "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
                "Terraform", "Ansible", "Jenkins", "CI/CD", "GitHub Actions", "GitLab CI", "Linux",
                "Nginx", "Prometheus", "Grafana", "Microservices", "Serverless", "Kafka", "RabbitMQ"
        ));
        SKILLS_TAXONOMY.put("AI / Data Science", List.of(
                "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy",
                "Scikit-learn", "NLP", "LLM", "Generative AI", "Computer Vision", "Data Analysis", "Tableau", "Power BI"
        ));
        SKILLS_TAXONOMY.put("Tools & Methodologies", List.of(
                "Git", "GitHub", "GitLab", "Jira", "Postman", "Swagger", "JUnit", "Mockito",
                "Jest", "Cypress", "Selenium", "Agile", "Scrum", "System Design", "Object Oriented Programming", "OOP"
        ));
        SKILLS_TAXONOMY.put("Soft Skills", List.of(
                "Leadership", "Communication", "Problem Solving", "Team Collaboration", "Project Management",
                "Time Management", "Critical Thinking", "Adaptability", "Mentorship"
        ));
    }

    private static final List<String> ACTION_VERBS = List.of(
            "built", "developed", "architected", "implemented", "designed", "engineered", "optimized",
            "spearheaded", "led", "managed", "deployed", "refactored", "integrated", "automated",
            "created", "scaled", "orchestrated", "collaborated", "reduced", "improved", "launched"
    );

    /**
     * Parse resume from MultipartFile (PDF, DOCX, TXT)
     */
    public ResumeDataDto parseFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        String text = "";

        try (InputStream is = file.getInputStream()) {
            if (filename.endsWith(".pdf")) {
                byte[] bytes = file.getBytes();
                try (PDDocument doc = Loader.loadPDF(bytes)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    text = stripper.getText(doc);
                }
            } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
                try (XWPFDocument doc = new XWPFDocument(is);
                     XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
                    text = extractor.getText();
                }
            } else {
                // Plain text / fallback
                text = new String(file.getBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            logger.error("Error reading file {}: {}", filename, e.getMessage());
            throw new RuntimeException("Could not extract text from resume: " + e.getMessage());
        }

        return parseText(text);
    }

    /**
     * Parse raw text string into structured ResumeDataDto
     */
    public ResumeDataDto parseText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            throw new IllegalArgumentException("Resume text is empty");
        }

        String text = rawText.trim();

        // 1. Extract contact details
        String email = extractEmail(text);
        String phone = extractPhone(text);
        String name = extractName(text);
        String location = extractLocation(text);
        String summary = extractSummary(text);

        // 2. Extract Skills
        Map<String, List<String>> categorizedSkills = new LinkedHashMap<>();
        List<String> allSkills = new ArrayList<>();

        for (Map.Entry<String, List<String>> entry : SKILLS_TAXONOMY.entrySet()) {
            List<String> matched = new ArrayList<>();
            for (String skill : entry.getValue()) {
                if (containsSkill(text, skill)) {
                    matched.add(skill);
                    allSkills.add(skill);
                }
            }
            if (!matched.isEmpty()) {
                categorizedSkills.put(entry.getKey(), matched);
            }
        }

        // 3. Extract Experience & Projects
        List<ExperienceItem> experienceList = extractExperience(text);
        List<ProjectItem> projectList = extractProjects(text, allSkills);
        List<EducationItem> educationList = extractEducation(text);
        List<String> certifications = extractCertifications(text);

        // 4. Estimate total experience & suggested title
        int totalExpYears = estimateExperienceYears(text, experienceList);
        String suggestedTitle = inferJobTitle(text, allSkills, experienceList);

        // 5. Evaluate ATS score & improvements
        AtsScoreDetails atsScore = evaluateAts(text, allSkills, experienceList, projectList, educationList);

        return ResumeDataDto.builder()
                .rawText(text)
                .candidateName(name)
                .candidateEmail(email)
                .candidatePhone(phone)
                .candidateLocation(location)
                .candidateSummary(summary)
                .suggestedJobTitle(suggestedTitle)
                .totalExperienceYears(totalExpYears)
                .allSkills(allSkills)
                .categorizedSkills(categorizedSkills)
                .experienceList(experienceList)
                .projectList(projectList)
                .educationList(educationList)
                .certifications(certifications)
                .atsEvaluation(atsScore)
                .build();
    }

    private boolean containsSkill(String text, String skill) {
        String regex = "(?i)\\b" + Pattern.quote(skill) + "\\b";
        return Pattern.compile(regex).matcher(text).find();
    }

    private String extractEmail(String text) {
        Pattern pattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(0) : "";
    }

    private String extractPhone(String text) {
        Pattern pattern = Pattern.compile("(?:\\+?\\d{1,3}[-.\s]?)?\\(?\\d{3}\\)?[-.\s]?\\d{3}[-.\s]?\\d{4}");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(0).trim() : "";
    }

    private String extractName(String text) {
        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() > 2 && trimmed.length() < 40 &&
                    !trimmed.toLowerCase().contains("resume") &&
                    !trimmed.toLowerCase().contains("curriculum") &&
                    !trimmed.contains("@") &&
                    !trimmed.matches(".*\\d.*")) {
                return trimmed;
            }
        }
        return "Candidate";
    }

    private String extractLocation(String text) {
        Pattern pattern = Pattern.compile("(?i)(?:Location|Address|City|Based in)?[:\\s]*([A-Z][a-zA-Z]+(?:,\\s*[A-Z]{2}|,\\s*[A-Za-z]+)?)");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String match = matcher.group(1).trim();
            if (match.length() > 2 && match.length() < 35) {
                return match;
            }
        }
        return "Not specified";
    }

    private String extractSummary(String text) {
        Pattern pattern = Pattern.compile("(?i)(?:Summary|Professional Summary|About Me|Profile)[\\s\\n:]+([\\s\\S]{30,350}?)(?:Experience|Skills|Projects|Education|\\n\\s*\\n)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).replaceAll("\\s+", " ").trim();
        }
        return "";
    }

    private List<ExperienceItem> extractExperience(String text) {
        List<ExperienceItem> list = new ArrayList<>();
        Pattern expSectionPattern = Pattern.compile("(?i)(?:Work Experience|Experience|Employment History)[\\s\\n:]+([\\s\\S]{50,1500}?)(?:Projects|Education|Skills|Certifications|$)", Pattern.CASE_INSENSITIVE);
        Matcher sectionMatcher = expSectionPattern.matcher(text);

        String expText = sectionMatcher.find() ? sectionMatcher.group(1) : text;
        String[] lines = expText.split("\\r?\\n");

        ExperienceItem current = null;
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isBlank()) continue;

            // Check if line looks like a job role / title
            if (line.matches("(?i).*(Developer|Engineer|Architect|Specialist|Manager|Consultant|Intern|Analyst|Lead|Director).*")
                    && line.length() < 90) {
                if (current != null) {
                    list.add(current);
                }
                current = new ExperienceItem();
                current.setRole(line);
                current.setCompany("Company / Organization");
                current.setDuration("Recent");
                current.setHighlights(new ArrayList<>());
            } else if (current != null) {
                if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*")) {
                    current.getHighlights().add(line.replaceAll("^[•\\-*\\s]+", ""));
                } else if (line.matches(".*(20\\d\\d|19\\d\\d|Present|Current).*") && line.length() < 40) {
                    current.setDuration(line);
                }
            }
        }

        if (current != null) {
            list.add(current);
        }

        if (list.isEmpty()) {
            list.add(ExperienceItem.builder()
                    .role("Software Engineer / Developer")
                    .company("Professional Experience")
                    .duration("1-3 Years")
                    .highlights(List.of("Developed and maintained software solutions", "Collaborated with cross-functional teams"))
                    .build());
        }

        return list;
    }

    private List<ProjectItem> extractProjects(String text, List<String> extractedSkills) {
        List<ProjectItem> list = new ArrayList<>();
        Pattern pattern = Pattern.compile("(?i)(?:Projects|Key Projects|Personal Projects)[\\s\\n:]+([\\s\\S]{30,1200}?)(?:Education|Experience|Certifications|Skills|$)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            String[] lines = matcher.group(1).split("\\r?\\n");
            ProjectItem current = null;

            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isBlank()) continue;

                if (line.length() < 60 && !line.startsWith("•") && !line.startsWith("-")) {
                    if (current != null) list.add(current);
                    current = new ProjectItem();
                    current.setTitle(line);
                    current.setDescription("");
                    current.setTechnologies(new ArrayList<>());
                } else if (current != null) {
                    current.setDescription(current.getDescription() + " " + line);
                    for (String skill : extractedSkills) {
                        if (line.toLowerCase().contains(skill.toLowerCase()) && !current.getTechnologies().contains(skill)) {
                            current.getTechnologies().add(skill);
                        }
                    }
                }
            }
            if (current != null) list.add(current);
        }

        if (list.isEmpty()) {
            list.add(ProjectItem.builder()
                    .title("Full Stack Web Application")
                    .description("Designed and built a responsive application with authentication and persistent database storage.")
                    .technologies(extractedSkills.stream().limit(4).collect(Collectors.toList()))
                    .build());
        }

        return list;
    }

    private List<EducationItem> extractEducation(String text) {
        List<EducationItem> list = new ArrayList<>();
        Pattern pattern = Pattern.compile("(?i)(?:B\\.?(?:Tech|E|S|Sc)|M\\.?(?:Tech|S|Sc|CA)|Bachelor|Master|Diploma|Associate)[^\\n]{0,80}", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);

        while (matcher.find()) {
            String match = matcher.group(0).trim();
            list.add(EducationItem.builder()
                    .degree(match)
                    .institution("University / College")
                    .year("Graduated")
                    .build());
        }

        if (list.isEmpty()) {
            list.add(EducationItem.builder()
                    .degree("Bachelor of Science / Computer Science")
                    .institution("University")
                    .year("Completed")
                    .build());
        }

        return list;
    }

    private List<String> extractCertifications(String text) {
        List<String> list = new ArrayList<>();
        Pattern pattern = Pattern.compile("(?i)(AWS Certified[^\\n]{0,50}|Oracle Certified[^\\n]{0,50}|Certified Kubernetes[^\\n]{0,50}|Google Cloud Certified[^\\n]{0,50}|Microsoft Certified[^\\n]{0,50}|Scrum Master[^\\n]{0,50})");
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            list.add(matcher.group(1).trim());
        }
        return list;
    }

    private int estimateExperienceYears(String text, List<ExperienceItem> expList) {
        Pattern pattern = Pattern.compile("(\\d+)\\+?\\s*(?:years|yrs)\\s*(?:of)?\\s*(?:experience|exp)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return Math.max(1, Math.min(15, expList.size() * 2));
    }

    private String inferJobTitle(String text, List<String> skills, List<ExperienceItem> expList) {
        if (!expList.isEmpty() && expList.get(0).getRole() != null) {
            String role = expList.get(0).getRole();
            if (role.length() < 40) return role;
        }

        boolean hasJava = skills.stream().anyMatch(s -> s.equalsIgnoreCase("Java") || s.equalsIgnoreCase("Spring Boot"));
        boolean hasPython = skills.stream().anyMatch(s -> s.equalsIgnoreCase("Python") || s.equalsIgnoreCase("Django"));
        boolean hasReact = skills.stream().anyMatch(s -> s.equalsIgnoreCase("React") || s.equalsIgnoreCase("JavaScript"));
        boolean hasDevops = skills.stream().anyMatch(s -> s.equalsIgnoreCase("Docker") || s.equalsIgnoreCase("AWS") || s.equalsIgnoreCase("Kubernetes"));

        if (hasJava && hasReact) return "Full Stack Java Developer";
        if (hasJava) return "Java Backend Engineer";
        if (hasPython && hasDevops) return "Python Cloud & DevOps Engineer";
        if (hasPython) return "Python Developer / Data Engineer";
        if (hasReact) return "Frontend Engineer";
        return "Software Developer";
    }

    /**
     * Compute ATS Score Breakdown and improvement suggestions
     */
    private AtsScoreDetails evaluateAts(String text, List<String> skills, List<ExperienceItem> exp, List<ProjectItem> projects, List<EducationItem> edu) {
        int skillsScore = Math.min(100, Math.max(30, skills.size() * 8));
        int experienceScore = Math.min(100, Math.max(40, exp.size() * 25 + (text.contains("achievement") || text.contains("impact") ? 15 : 0)));
        
        long actionVerbCount = ACTION_VERBS.stream()
                .filter(verb -> Pattern.compile("(?i)\\b" + verb + "\\b").matcher(text).find())
                .count();
        int impactScore = Math.min(100, (int) (actionVerbCount * 12) + 30);

        List<String> detectedSections = new ArrayList<>();
        List<String> missingSections = new ArrayList<>();

        if (text.toLowerCase().contains("experience")) detectedSections.add("Experience"); else missingSections.add("Experience");
        if (text.toLowerCase().contains("skill")) detectedSections.add("Skills"); else missingSections.add("Skills");
        if (text.toLowerCase().contains("education")) detectedSections.add("Education"); else missingSections.add("Education");
        if (text.toLowerCase().contains("project")) detectedSections.add("Projects"); else missingSections.add("Projects");
        if (text.toLowerCase().contains("summary") || text.toLowerCase().contains("profile")) detectedSections.add("Professional Summary"); else missingSections.add("Professional Summary");

        int formattingScore = (detectedSections.size() * 20);

        int overallScore = (int) (skillsScore * 0.35 + experienceScore * 0.25 + impactScore * 0.20 + formattingScore * 0.20);
        overallScore = Math.min(100, Math.max(35, overallScore));

        String rating = overallScore >= 80 ? "Excellent" : (overallScore >= 60 ? "Good" : "Needs Optimization");

        List<String> strengths = new ArrayList<>();
        List<String> improvements = new ArrayList<>();

        if (skills.size() >= 8) {
            strengths.add("Strong technical keyword density (" + skills.size() + " skills detected)");
        } else {
            improvements.add("Add more specific technical keywords (frameworks, databases, cloud tools)");
        }

        if (actionVerbCount >= 5) {
            strengths.add("Effective use of strong action verbs in project descriptions");
        } else {
            improvements.add("Use more impact action verbs like 'Architected', 'Optimized', 'Automated'");
        }

        if (!missingSections.isEmpty()) {
            improvements.add("Include missing standard sections: " + String.join(", ", missingSections));
        } else {
            strengths.add("Complete ATS-friendly section layout");
        }

        if (text.contains("%") || text.matches(".*\\b\\d+\\b.*")) {
            strengths.add("Quantifiable achievements and metrics detected");
        } else {
            improvements.add("Quantify your achievements with numbers, percentages, or performance gains (e.g. 'reduced latency by 30%')");
        }

        return AtsScoreDetails.builder()
                .overallScore(overallScore)
                .skillsScore(skillsScore)
                .experienceScore(experienceScore)
                .formattingScore(formattingScore)
                .brevityAndImpactScore(impactScore)
                .atsRating(rating)
                .strengths(strengths)
                .improvements(improvements)
                .detectedSections(detectedSections)
                .missingSections(missingSections)
                .build();
    }
}
