package com.example.backend.service;

import com.example.backend.dto.CareerRoadmapDto;
import com.example.backend.dto.CareerRoadmapDto.*;
import com.example.backend.dto.JobMatchAnalysisDto;
import com.example.backend.dto.JobMatchAnalysisDto.*;
import com.example.backend.model.Job;
import com.example.backend.repository.JobRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CareerIntelligenceService {

    private final JobRepository jobRepository;
    private final ResumeParserService resumeParserService;

    public CareerIntelligenceService(JobRepository jobRepository, ResumeParserService resumeParserService) {
        this.jobRepository = jobRepository;
        this.resumeParserService = resumeParserService;
    }

    /**
     * Analyze matching between a Job and candidate skills/experience
     */
    public JobMatchAnalysisDto analyzeJobMatch(Job job, List<String> candidateSkills, int candidateExpYears) {
        if (candidateSkills == null) {
            candidateSkills = List.of("Java", "Spring Boot", "React", "SQL", "Git");
        }

        String jobText = (job.getTitle() + " " + (job.getDescription() != null ? job.getDescription() : "")).toLowerCase();
        
        // 1. Identify all skills mentioned in the job
        List<String> requiredSkills = new ArrayList<>();
        List<String> allKnownSkills = List.of(
                "Java", "Python", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "SQL",
                "Spring Boot", "Spring", "React", "Angular", "Vue", "Node.js", "Express", "Next.js", "Django", "Flask", "FastAPI",
                "PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra", "Oracle", "DynamoDB", "Elasticsearch", "Kafka",
                "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins", "CI/CD", "Linux", "Microservices", "GraphQL", "REST API",
                "Git", "System Design", "Agile", "Machine Learning", "PyTorch", "TensorFlow", "Tailwind CSS", "Redux"
        );

        for (String skill : allKnownSkills) {
            if (jobText.contains(skill.toLowerCase())) {
                requiredSkills.add(skill);
            }
        }

        if (requiredSkills.isEmpty()) {
            requiredSkills = inferSkillsFromTitle(job.getTitle());
        }

        // 2. Classify Matched vs Missing
        List<String> finalCandidateSkills = candidateSkills;
        List<String> matched = requiredSkills.stream()
                .filter(skill -> finalCandidateSkills.stream().anyMatch(cs -> cs.equalsIgnoreCase(skill)))
                .collect(Collectors.toList());

        List<String> missing = requiredSkills.stream()
                .filter(skill -> finalCandidateSkills.stream().noneMatch(cs -> cs.equalsIgnoreCase(skill)))
                .collect(Collectors.toList());

        // Split missing into Critical (top 3) and Preferred
        List<String> missingCritical = missing.stream().limit(3).collect(Collectors.toList());
        List<String> missingPreferred = missing.stream().skip(3).collect(Collectors.toList());

        // 3. Compute Granular Match Scores
        int skillMatchPct = requiredSkills.isEmpty() ? 70 : (int) (((double) matched.size() / requiredSkills.size()) * 100);
        int expMatchPct = Math.min(100, Math.max(40, 60 + candidateExpYears * 10));
        int overallMatch = (int) (skillMatchPct * 0.70 + expMatchPct * 0.30);
        overallMatch = Math.min(98, Math.max(30, overallMatch));

        // 4. Interview Probability & Confidence
        int interviewProb = Math.min(95, Math.max(20, (int) (overallMatch * 0.85 + (matched.size() >= 3 ? 10 : 0))));
        String confidence = overallMatch >= 80 ? "High" : (overallMatch >= 60 ? "Medium" : (overallMatch >= 45 ? "Moderate" : "Low"));
        String confidenceColor = overallMatch >= 80 ? "#10b981" : (overallMatch >= 60 ? "#3b82f6" : (overallMatch >= 45 ? "#f59e0b" : "#ef4444"));

        // 5. Learning Recommendations
        List<LearningRecommendation> learningList = new ArrayList<>();
        for (String mSkill : missing) {
            learningList.add(LearningRecommendation.builder()
                    .skill(mSkill)
                    .category(categorizeSkill(mSkill))
                    .estimatedTimeToLearn(estimateStudyTime(mSkill))
                    .resourceTitle(mSkill + " Mastery & Official Guide")
                    .resourceLink("https://www.google.com/search?q=" + mSkill.replace(" ", "+") + "+tutorial+roadmap")
                    .importance(missingCritical.contains(mSkill) ? "Critical" : "Recommended")
                    .build());
        }

        // 6. Curated Interview Questions for this stack
        List<InterviewQuestion> prepQuestions = generateInterviewQuestions(matched, missing, job.getTitle());

        String summary = String.format("You match %d of %d key skills required for this %s position at %s. Focus on %s to increase interview readiness.",
                matched.size(), requiredSkills.size(), job.getTitle(), job.getCompany(),
                missingCritical.isEmpty() ? "refining system design" : String.join(" and ", missingCritical));

        return JobMatchAnalysisDto.builder()
                .jobId(job.getId())
                .jobTitle(job.getTitle())
                .company(job.getCompany())
                .location(job.getLocation())
                .source(job.getSource())
                .applyLink(job.getApplyLink())
                .overallMatchPercentage(overallMatch)
                .skillMatchPercentage(skillMatchPct)
                .experienceMatchPercentage(expMatchPct)
                .interviewProbability(interviewProb)
                .matchConfidence(confidence)
                .matchConfidenceColor(confidenceColor)
                .matchedSkills(matched)
                .missingCriticalSkills(missingCritical)
                .missingPreferredSkills(missingPreferred)
                .learningRecommendations(learningList)
                .interviewPrepQuestions(prepQuestions)
                .matchSummary(summary)
                .build();
    }

    /**
     * Generate dynamic career roadmap
     */
    public CareerRoadmapDto generateCareerRoadmap(String currentRole, String targetRole, List<String> currentSkills, int expYears) {
        if (currentRole == null || currentRole.isBlank()) currentRole = "Software Developer";
        if (targetRole == null || targetRole.isBlank()) targetRole = "Product Manager";

        String targetLower = targetRole.toLowerCase().trim();
        String currentLower = currentRole.toLowerCase().trim();

        List<RoadmapStage> stages = new ArrayList<>();
        List<ProjectIdea> projects = new ArrayList<>();
        String timeFrame;
        String readinessScore;

        if (targetLower.contains("product") || targetLower.contains("pm") || targetLower.contains("owner")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Product Discovery, User Research & Customer Empathy")
                    .timeFrame("Months 1-3")
                    .description("Master customer interviews, problem framing, opportunity solution trees, and market sizing (TAM/SAM/SOM).")
                    .skillsToMaster(List.of("PRD Writing", "User Journey Mapping", "Figma Wireframing", "Customer Discovery", "TAM Sizing"))
                    .actionItems(List.of(
                            "Conduct 10+ user interviews to identify core friction points in target software domains",
                            "Draft 2 end-to-end Product Requirement Documents (PRDs) with clear user stories and success metrics",
                            "Create wireframes and low-fidelity prototypes in Figma to validate solutions before writing code"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Product Analytics, A/B Testing & Prioritization")
                    .timeFrame("Months 4-6")
                    .description("Establish North Star metrics, master data-driven decision frameworks (RICE, MoSCoW), and execute A/B experimentation.")
                    .skillsToMaster(List.of("North Star Metrics", "Mixpanel / Amplitude", "A/B Testing", "SQL for Product", "RICE Framework"))
                    .actionItems(List.of(
                            "Set up tracking funnels in Amplitude / Mixpanel to analyze user conversion drop-off",
                            "Design and execute hypothesis-driven A/B test experiments with statistical significance",
                            "Lead backlog refinement and sprint planning as the strategic bridge between business and engineering"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Go-to-Market (GTM) Strategy, Monetization & Executive Leadership")
                    .timeFrame("Months 7-9")
                    .description("Lead multi-channel product launches, develop monetization models, and communicate vision to leadership.")
                    .skillsToMaster(List.of("Go-to-Market (GTM)", "Product-Led Growth (PLG)", "Pricing Models", "Roadmap Evangelism", "Executive Comms"))
                    .actionItems(List.of(
                            "Formulate a complete product launch playbook with customer acquisition and retention loops",
                            "Model pricing and subscription unit economics (freemium vs tiered SaaS)",
                            "Present a quarterly thematic roadmap and OKR deck to executive stakeholders"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("B2B SaaS Product Specification & Clickable Prototype")
                    .description("End-to-end PRD, competitive teardown, and interactive Figma prototype solving workflow automation.")
                    .techStack(List.of("Figma", "Notion", "Mixpanel", "SQL", "Whimsical"))
                    .difficulty("Intermediate")
                    .industryValue("Proves practical product thinking, discovery rigor, and cross-functional technical communication.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Growth Funnel & A/B Experimentation Teardown")
                    .description("Comprehensive data teardown of a top product's onboarding flow with prioritized hypothesis experiments.")
                    .techStack(List.of("Amplitude", "SQL", "PostHog", "Google Analytics 4"))
                    .difficulty("Advanced")
                    .industryValue("Demonstrates quantitative decision-making, retention modeling, and product-led growth strategy.")
                    .build());

            readinessScore = currentLower.contains("engineer") || currentLower.contains("developer") ? "74%" : "68%";
            timeFrame = "6 - 9 Months";

        } else if (targetLower.contains("data sci") || targetLower.contains("machine learning") || targetLower.contains("ai") || targetLower.contains("ml") || targetLower.contains("llm")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Statistical Foundations & Advanced Data Modeling")
                    .timeFrame("Months 1-3")
                    .description("Master multivariate statistics, hypothesis testing, exploratory data analysis, and advanced feature engineering.")
                    .skillsToMaster(List.of("Advanced Pandas / NumPy", "Feature Engineering", "Hypothesis Testing", "Scikit-Learn", "EDA"))
                    .actionItems(List.of(
                            "Perform deep exploratory analysis and anomaly detection on complex real-world datasets",
                            "Engineer domain-specific features and resolve class imbalance using SMOTE and stratification",
                            "Build benchmark supervised classification and regression pipelines with cross-validation"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Deep Learning, Modern Ensembles & Model Explainability")
                    .timeFrame("Months 4-6")
                    .description("Train PyTorch neural networks, gradient boosting algorithms, and implement explainable AI frameworks.")
                    .skillsToMaster(List.of("PyTorch", "XGBoost / LightGBM", "Deep Neural Networks", "SHAP / LIME", "Hyperparameter Tuning"))
                    .actionItems(List.of(
                            "Train and fine-tune convolutional or transformer neural networks in PyTorch",
                            "Benchmark gradient boosting models against baseline trees and interpret features via SHAP",
                            "Implement automated hyperparameter optimization using Optuna"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Production MLOps, LLM Engineering & Vector Search (RAG)")
                    .timeFrame("Months 7-10")
                    .description("Deploy containerized models with sub-50ms latency, build RAG pipelines, and monitor model/data drift.")
                    .skillsToMaster(List.of("MLflow", "Vector Databases (Pinecone/Milvus)", "RAG Architectures", "FastAPI Inference", "Model Monitoring"))
                    .actionItems(List.of(
                            "Build an end-to-end Retrieval-Augmented Generation (RAG) system with semantic chunking",
                            "Deploy trained models as containerized microservices behind FastAPI with latency SLOs",
                            "Set up automated model registry, data drift alerts, and periodic retraining pipelines in MLflow"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Production RAG Knowledge Engine with Vector Search")
                    .description("Domain-specific question answering system with semantic search, embeddings, and real-time inference.")
                    .techStack(List.of("Python", "PyTorch", "LangChain", "Pinecone", "FastAPI", "Docker"))
                    .difficulty("Advanced")
                    .industryValue("Demonstrates high-demand generative AI and scalable vector search production engineering.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Predictive Churn & Lifetime Value Pipeline with MLOps")
                    .description("End-to-end machine learning pipeline with automated data validation, SHAP explainability, and MLflow tracking.")
                    .techStack(List.of("XGBoost", "Scikit-Learn", "MLflow", "FastAPI", "PostgreSQL"))
                    .difficulty("Intermediate")
                    .industryValue("Proves business-aligned machine learning engineering and production lifecycle ownership.")
                    .build());

            readinessScore = currentLower.contains("data") || currentLower.contains("python") ? "78%" : "65%";
            timeFrame = "7 - 10 Months";

        } else if (targetLower.contains("data anal") || targetLower.contains("business anal") || targetLower.contains("bi") || targetLower.contains("analytics")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Advanced SQL & Relational Data Wrangling")
                    .timeFrame("Months 1-2")
                    .description("Master complex analytical SQL including window functions, CTEs, subqueries, and database query optimization.")
                    .skillsToMaster(List.of("Window Functions", "CTEs & Recursive SQL", "Data Cleaning", "Relational Schemas", "Excel Modeling"))
                    .actionItems(List.of(
                            "Write multi-table analytical SQL queries calculating rolling averages, ranking, and cumulative sums",
                            "Build automated data cleaning and deduplication scripts in Python/Pandas",
                            "Model normalized relational database schemas for reporting efficiency"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Modern BI Dashboards & Executive Storytelling")
                    .timeFrame("Months 3-5")
                    .description("Transform complex metrics into intuitive executive dashboards with Power BI / Tableau and DAX.")
                    .skillsToMaster(List.of("Power BI / Tableau", "DAX Calculations", "Interactive Visualizations", "Cohort & Retention Analysis"))
                    .actionItems(List.of(
                            "Design an executive KPI cockpit tracking MRR, churn rate, and customer acquisition cost",
                            "Implement cohort retention heatmaps and dynamic scenario filters",
                            "Present actionable data stories with clear business recommendations to leadership"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Predictive Analytics, A/B Testing & Business Impact")
                    .timeFrame("Months 6-8")
                    .description("Leverage statistical modeling, A/B test analysis, and automated ETL pipelines to drive strategic decisions.")
                    .skillsToMaster(List.of("A/B Test Analytics", "Statistical Inference", "ETL Automation", "Business Metric Trees"))
                    .actionItems(List.of(
                            "Analyze A/B experiment test results and calculate statistical confidence intervals",
                            "Automate recurring reporting pipelines using Python and scheduled SQL jobs",
                            "Construct comprehensive business driver metric trees linking operational KPIs to revenue"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Executive SaaS Revenue & Cohort Retention Dashboard")
                    .description("Multi-tab interactive Power BI/Tableau dashboard with dynamic DAX metrics, cohort retention, and churn forecasting.")
                    .techStack(List.of("Power BI", "SQL", "DAX", "PostgreSQL", "Excel"))
                    .difficulty("Intermediate")
                    .industryValue("Provides immediate evidence of ability to translate raw data into executive-level strategic decisions.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("E-Commerce Attribution & Marketing ROI Analytics Engine")
                    .description("Python + SQL pipeline analyzing customer touchpoints and calculating multi-touch marketing attribution.")
                    .techStack(List.of("Python", "Pandas", "PostgreSQL", "Tableau", "Plotly"))
                    .difficulty("Intermediate")
                    .industryValue("Shows mastery of cross-functional business analysis and marketing unit economics.")
                    .build());

            readinessScore = currentLower.contains("analyst") || currentLower.contains("sql") ? "82%" : "72%";
            timeFrame = "5 - 8 Months";

        } else if (targetLower.contains("devops") || targetLower.contains("sre") || targetLower.contains("cloud") || targetLower.contains("platform") || targetLower.contains("infra")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Linux Internals, Networking & Containerization")
                    .timeFrame("Months 1-3")
                    .description("Master Linux systems engineering, core TCP/IP networking, shell scripting, and multi-stage Docker builds.")
                    .skillsToMaster(List.of("Linux Administration", "Bash Scripting", "Docker Containerization", "TCP/IP & DNS", "GitOps Basics"))
                    .actionItems(List.of(
                            "Optimize and secure container images with non-root users and multi-stage Dockerfiles",
                            "Automate system maintenance and log rotation with robust Bash scripts",
                            "Diagnose network latency and DNS resolution bottlenecks using tcpdump and curl"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Infrastructure as Code (IaC) & CI/CD Pipelines")
                    .timeFrame("Months 4-6")
                    .description("Provision repeatable cloud infrastructure with Terraform and build automated zero-downtime CI/CD workflows.")
                    .skillsToMaster(List.of("Terraform (IaC)", "Kubernetes (K8s)", "GitHub Actions / GitLab CI", "Helm Charts", "AWS/GCP Core"))
                    .actionItems(List.of(
                            "Provision production VPCs, subnets, and IAM roles using modular Terraform configurations",
                            "Build automated lint, test, build, and deploy GitHub Actions pipelines with secrets management",
                            "Deploy microservices to Kubernetes with custom Helm charts, ingress, and configmaps"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Cloud Observability, SRE Practices & Disaster Recovery")
                    .timeFrame("Months 7-9")
                    .description("Implement end-to-end monitoring, automated alerts, distributed tracing, and disaster recovery runbooks.")
                    .skillsToMaster(List.of("Prometheus & Grafana", "Distributed Tracing", "SRE & SLO/SLA", "Disaster Recovery", "Chaos Engineering"))
                    .actionItems(List.of(
                            "Configure centralized logging and real-time alert policies in Prometheus/Grafana",
                            "Implement automated canary releases with Argo Rollouts and automated rollback triggers",
                            "Author and execute disaster recovery runbooks with automated database failover tests"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Multi-Region Kubernetes Cluster with Automated GitOps")
                    .description("Terraform-provisioned cloud cluster with automated ArgoCD continuous delivery, ingress, and SSL cert automation.")
                    .techStack(List.of("Terraform", "Kubernetes", "ArgoCD", "AWS", "Helm", "Docker"))
                    .difficulty("Advanced")
                    .industryValue("Validates end-to-end modern cloud infrastructure automation and production readiness.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Full-Stack Observability & Incident Response Platform")
                    .description("Complete monitoring stack with Prometheus, Grafana, Jaeger distributed tracing, and Slack alert integrations.")
                    .techStack(List.of("Prometheus", "Grafana", "OpenTelemetry", "Jaeger", "Terraform"))
                    .difficulty("Intermediate")
                    .industryValue("Proves commitment to system reliability, observability, and modern SRE methodologies.")
                    .build());

            readinessScore = currentLower.contains("engineer") || currentLower.contains("sysadmin") ? "75%" : "66%";
            timeFrame = "6 - 9 Months";

        } else if (targetLower.contains("security") || targetLower.contains("cyber") || targetLower.contains("soc") || targetLower.contains("penetration") || targetLower.contains("infosec")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Network Protocols, Linux Hardening & Cryptography")
                    .timeFrame("Months 1-3")
                    .description("Deep dive into network security protocols, Linux OS hardening, access controls, and applied cryptography.")
                    .skillsToMaster(List.of("TCP/IP & OSI Model", "Linux Hardening", "Wireshark", "Applied Cryptography", "Nmap Port Scanning"))
                    .actionItems(List.of(
                            "Capture and analyze network packets with Wireshark to identify plaintext credentials and rogue traffic",
                            "Harden Linux servers according to CIS benchmarks (SSH keys, iptables/UFW, fail2ban)",
                            "Implement public/private key infrastructure (PKI) and SSL/TLS certificate management"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Vulnerability Assessment, Web Security & Threat Hunting")
                    .timeFrame("Months 4-6")
                    .description("Master the OWASP Top 10, security scanners, Burp Suite exploitation testing, and SIEM log analysis.")
                    .skillsToMaster(List.of("OWASP Top 10", "Burp Suite", "SIEM (Splunk/ELK)", "Vulnerability Scanning", "Threat Modeling"))
                    .actionItems(List.of(
                            "Identify and exploit OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF, IDOR) in sandbox environments",
                            "Deploy SIEM log collectors and configure rules to detect unauthorized privilege escalation",
                            "Conduct systematic threat modeling (STRIDE framework) for critical cloud architectures"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("DevSecOps, Cloud Security & Incident Response")
                    .timeFrame("Months 7-9")
                    .description("Automate security checks in CI/CD, govern cloud IAM, and establish rapid incident containment playbooks.")
                    .skillsToMaster(List.of("DevSecOps (SAST/DAST)", "Cloud Security (AWS IAM)", "Incident Response", "Zero Trust Architecture"))
                    .actionItems(List.of(
                            "Integrate automated SAST/DAST scans (SonarQube, OWASP ZAP) into deployment pipelines",
                            "Audit cloud IAM policies to enforce strict Principle of Least Privilege and MFA",
                            "Author and simulate an end-to-end ransomware incident containment and eradication runbook"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Automated DevSecOps Pipeline with Vulnerability Scanning")
                    .description("CI/CD pipeline with automated dependency scanning, SAST/DAST checks, and container image vulnerability gating.")
                    .techStack(List.of("GitHub Actions", "SonarQube", "Trivy", "OWASP ZAP", "Docker"))
                    .difficulty("Intermediate")
                    .industryValue("Essential for high-paying DevSecOps and modern application security engineering roles.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Enterprise SIEM Threat Detection Lab & Alerting Engine")
                    .description("Splunk/Elastic security monitoring lab detecting brute-force, lateral movement, and data exfiltration in real-time.")
                    .techStack(List.of("Splunk", "Elasticsearch", "Suricata", "Linux", "Python"))
                    .difficulty("Advanced")
                    .industryValue("Validates hands-on Security Operations Center (SOC) and defensive engineering capabilities.")
                    .build());

            readinessScore = currentLower.contains("engineer") || currentLower.contains("network") ? "72%" : "64%";
            timeFrame = "6 - 9 Months";

        } else if (targetLower.contains("design") || targetLower.contains("ui") || targetLower.contains("ux")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Design Systems, Figma Precision & Typography")
                    .timeFrame("Months 1-2")
                    .description("Master Figma auto-layout, component variants, visual hierarchy, responsive grid systems, and typography rules.")
                    .skillsToMaster(List.of("Figma Auto-Layout", "Design Tokens", "Visual Hierarchy", "Typography & Color Theory", "Component Libraries"))
                    .actionItems(List.of(
                            "Construct a scalable Figma design system with tokens, variables, and dark/light mode variants",
                            "Redesign complex web interfaces emphasizing clean visual rhythm and contrast standards (WCAG AAA)",
                            "Build responsive layout components adapting seamlessly across mobile, tablet, and desktop viewports"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("User Research, Interaction Prototyping & Usability Testing")
                    .timeFrame("Months 3-5")
                    .description("Execute user interviews, information architecture, micro-interactions, and moderated usability testing.")
                    .skillsToMaster(List.of("User Research", "Interactive Prototyping", "Usability Testing (Maze)", "Information Architecture"))
                    .actionItems(List.of(
                            "Conduct 5+ moderated usability sessions with Maze/UserTesting to uncover user cognitive friction",
                            "Build advanced micro-interaction prototypes with smart animation and variable logic in Figma",
                            "Synthesize user journey maps, affinity diagrams, and persona empathy maps from feedback"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Conversion Optimization, Developer Handoff & Product Strategy")
                    .timeFrame("Months 6-8")
                    .description("Design high-converting funnels, streamline engineering handoffs with tokens, and participate in product strategy.")
                    .skillsToMaster(List.of("Conversion Rate Optimization", "Developer Handoff", "Design Strategy", "Accessibility (WCAG 2.1)"))
                    .actionItems(List.of(
                            "Create comprehensive developer specification handoff documentation with spacing and interaction states",
                            "Optimize checkout and onboarding flows through data-driven UX enhancements",
                            "Publish two comprehensive case studies detailing the problem, research, iterations, and business outcomes"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Fintech Mobile Banking App Design System & Prototype")
                    .description("Complete mobile app prototype featuring custom design tokens, micro-interactions, and biometric authentication flow.")
                    .techStack(List.of("Figma", "FigJam", "Maze", "Principle"))
                    .difficulty("Intermediate")
                    .industryValue("Key portfolio cornerstone demonstrating system thinking and refined interaction polish.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Enterprise SaaS Workflow Redesign & Usability Case Study")
                    .description("Data-driven UX overhaul of a complex analytical tool with before/after usability metrics and task completion rates.")
                    .techStack(List.of("Figma", "Miro", "Loom", "Notion"))
                    .difficulty("Advanced")
                    .industryValue("Proves business-oriented product design, research rigor, and measurable UX impact.")
                    .build());

            readinessScore = currentLower.contains("frontend") || currentLower.contains("web") ? "80%" : "69%";
            timeFrame = "5 - 8 Months";

        } else if (targetLower.contains("frontend") || targetLower.contains("react") || targetLower.contains("mobile") || targetLower.contains("ios") || targetLower.contains("android")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Modern Component Architecture & State Management")
                    .timeFrame("Months 1-3")
                    .description("Master advanced React/TypeScript, component lifecycle, predictable state management, and responsive layouts.")
                    .skillsToMaster(List.of("React 18+", "TypeScript", "Tailwind CSS", "Zustand / Redux Toolkit", "Custom Hooks"))
                    .actionItems(List.of(
                            "Refactor complex component trees into modular, reusable components with strict TypeScript types",
                            "Implement global client-side caching and state management using Zustand and TanStack Query",
                            "Build fully accessible (ARIA compliant) interactive widgets adhering to WCAG 2.1 standards"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Server-Side Rendering (SSR) & Web Performance Optimization")
                    .timeFrame("Months 4-6")
                    .description("Build Next.js / React Server Component apps and optimize Core Web Vitals for sub-second page loads.")
                    .skillsToMaster(List.of("Next.js App Router", "Server Components (RSC)", "Core Web Vitals", "Bundle Splitting", "Web Workers"))
                    .actionItems(List.of(
                            "Achieve 95+ Google Lighthouse scores through bundle splitting, dynamic imports, and image optimization",
                            "Implement hybrid static site generation (SSG) and incremental static regeneration (ISR)",
                            "Integrate end-to-end type safety across client and server with tRPC or GraphQL"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Micro-Frontends, Design Token Pipelines & Testing")
                    .timeFrame("Months 7-9")
                    .description("Lead frontend architectural reviews, build automated testing suites, and establish design token synchronization.")
                    .skillsToMaster(List.of("Playwright / Jest", "Micro-Frontends", "CI/CD for Web", "WebSockets / WebRTC", "Design Tokens"))
                    .actionItems(List.of(
                            "Author resilient unit and end-to-end tests achieving 85%+ code coverage with Jest and Playwright",
                            "Build real-time collaborative features using WebSockets and optimistic UI updates",
                            "Establish automated design token synchronization between Figma and Tailwind configuration"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Ultra-Fast E-Commerce Web Application (100/100 Lighthouse)")
                    .description("Next.js 14 App Router application with edge rendering, instant search, and headless payment integration.")
                    .techStack(List.of("Next.js", "TypeScript", "Tailwind CSS", "Zustand", "Stripe"))
                    .difficulty("Advanced")
                    .industryValue("Validates production performance optimization and modern frontend architecture mastery.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Real-Time Collaborative Workspace with Optimistic UI")
                    .description("Slack/Notion-like interactive platform with WebSocket live updates, drag-and-drop, and offline sync.")
                    .techStack(List.of("React", "TypeScript", "Socket.io", "PostgreSQL", "Tailwind"))
                    .difficulty("Intermediate")
                    .industryValue("Proves advanced client-side state handling, concurrency, and real-time networking.")
                    .build());

            readinessScore = currentLower.contains("developer") || currentLower.contains("javascript") ? "84%" : "72%";
            timeFrame = "5 - 8 Months";

        } else if (targetLower.contains("qa") || targetLower.contains("test") || targetLower.contains("sdet")) {
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle("Test Strategy, API Automation & Edge Case Design")
                    .timeFrame("Months 1-2")
                    .description("Master manual exploratory testing, test matrix design, and automated REST API verification.")
                    .skillsToMaster(List.of("REST Assured", "Postman Automation", "Test Case Design", "Boundary Value Analysis", "SQL for Testing"))
                    .actionItems(List.of(
                            "Construct comprehensive test plan matrices covering functional, negative, and security edge cases",
                            "Build automated API test collections with assertions and variable chaining in Postman / RestAssured",
                            "Validate database state and integrity before and after transaction execution using SQL scripts"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("End-to-End Test Automation Frameworks (Web & Mobile)")
                    .timeFrame("Months 3-5")
                    .description("Build maintainable Page Object Model (POM) automation suites in Playwright, Selenium, or Cypress.")
                    .skillsToMaster(List.of("Playwright", "Selenium WebDriver", "Page Object Model (POM)", "Cucumber / BDD", "TestNG / JUnit"))
                    .actionItems(List.of(
                            "Architect a modular Page Object Model automation framework from scratch with parallel execution",
                            "Implement BDD feature files in Gherkin and link to step definitions with Cucumber",
                            "Integrate automated screenshot and video capture on test failure for rapid triage"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Performance Testing, CI/CD Sharding & Chaos Engineering")
                    .timeFrame("Months 6-8")
                    .description("Simulate high-concurrency user loads with k6/JMeter and integrate automated test gates in CI/CD.")
                    .skillsToMaster(List.of("k6 / JMeter", "Performance Benchmarking", "CI/CD Test Sharding", "Dockerized Test Grid"))
                    .actionItems(List.of(
                            "Execute load, stress, and endurance performance tests simulating 10k+ concurrent virtual users in k6",
                            "Set up parallel test sharding in GitHub Actions reducing regression run times from hours to minutes",
                            "Establish automated smoke test gates preventing regressions from reaching production environments"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("Distributed Playwright Test Automation Framework with CI/CD")
                    .description("Cross-browser test framework with parallel test runner, detailed HTML reports, and automated CI execution.")
                    .techStack(List.of("Playwright", "TypeScript", "Docker", "GitHub Actions", "Allure Reports"))
                    .difficulty("Intermediate")
                    .industryValue("Provides clear evidence of SDET capability to build and maintain scalable testing infrastructure.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("High-Concurrency Load & Stress Testing Suite")
                    .description("k6 performance testing suite evaluating API response latencies, memory leaks, and breaking points under peak loads.")
                    .techStack(List.of("k6", "JavaScript", "Grafana", "InfluxDB", "Docker"))
                    .difficulty("Advanced")
                    .industryValue("Validates expertise in non-functional testing, system reliability, and performance bottlenecks.")
                    .build());

            readinessScore = currentLower.contains("developer") || currentLower.contains("qa") ? "86%" : "74%";
            timeFrame = "4 - 7 Months";

        } else {
            // General / Dynamic Tailored Roadmap for Any Custom Role (e.g. Sales, Marketing, Technical Writer, Blockchain, etc.)
            String cleanTarget = targetRole.trim();
            stages.add(RoadmapStage.builder()
                    .stageNumber(1)
                    .stageTitle(cleanTarget + " Foundations & Core Competencies")
                    .timeFrame("Months 1-3")
                    .description("Establish deep technical and theoretical command over the foundational methodologies, tools, and workflows of " + cleanTarget + ".")
                    .skillsToMaster(List.of(cleanTarget + " Core Principles", "Industry Tooling", "Workflow Optimization", "Domain Fundamentals", "Best Practices"))
                    .actionItems(List.of(
                            "Master the fundamental industry frameworks, terminology, and operational standards of " + cleanTarget,
                            "Complete hands-on sandbox simulations replicating day-to-day enterprise responsibilities",
                            "Identify transferable strengths from your current role as " + currentRole + " to accelerate early progress"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(2)
                    .stageTitle("Advanced Execution, Tool Mastery & Cross-Functional Impact")
                    .timeFrame("Months 4-6")
                    .description("Apply advanced techniques, industry-standard toolchains, and collaborate on real-world projects simulating senior-level execution.")
                    .skillsToMaster(List.of("Advanced " + cleanTarget + " Practices", "Cross-Functional Collaboration", "Metrics & KPI Tracking", "Quality Assurance"))
                    .actionItems(List.of(
                            "Lead end-to-end deliverables demonstrating autonomy and strategic problem-solving in " + cleanTarget,
                            "Establish measurable benchmarks to track efficiency and quality gains across your deliverables",
                            "Collaborate with peers to review, critique, and refine production-grade work samples"
                    ))
                    .build());

            stages.add(RoadmapStage.builder()
                    .stageNumber(3)
                    .stageTitle("Strategic Leadership, Portfolio Proof & Market Positioning")
                    .timeFrame("Months 7-9")
                    .description("Solidify your position with verified portfolio evidence, leadership initiatives, and strategic interview readiness.")
                    .skillsToMaster(List.of("Strategic Leadership", "Portfolio Presentation", "Stakeholder Communication", "Mentorship"))
                    .actionItems(List.of(
                            "Publish two comprehensive case studies detailing the problem, methodology, and tangible results achieved",
                            "Mentor emerging practitioners and author knowledge-sharing documentation for the community",
                            "Conduct targeted behavioral and technical mock interviews tailored specifically to " + cleanTarget + " hiring bars"
                    ))
                    .build());

            projects.add(ProjectIdea.builder()
                    .title("End-to-End " + cleanTarget + " Flagship Portfolio Project")
                    .description("Comprehensive, production-grade initiative solving a real enterprise challenge in " + cleanTarget + " from discovery to execution.")
                    .techStack(List.of(cleanTarget, "Documentation", "Metrics", "Industry Standards"))
                    .difficulty("Advanced")
                    .industryValue("Provides definitive proof of competency and readiness to step into " + cleanTarget + " roles.")
                    .build());

            projects.add(ProjectIdea.builder()
                    .title(cleanTarget + " Optimization & Best Practice Case Study")
                    .description("Rigorous analysis and execution showing measurable efficiency, accuracy, or revenue improvements.")
                    .techStack(List.of("Analytics", "Strategy", "Case Study", cleanTarget))
                    .difficulty("Intermediate")
                    .industryValue("Demonstrates analytical rigor, business impact, and modern industry methodologies.")
                    .build());

            readinessScore = "72%";
            timeFrame = "6 - 9 Months";
        }

        SalaryBenchmark benchmark = predictSalary(targetRole, "Remote / Major Tech Hub", expYears + 2, currentSkills);

        return CareerRoadmapDto.builder()
                .currentRole(currentRole)
                .targetRole(targetRole)
                .currentExperienceYears(expYears)
                .estimatedTimeToTarget(timeFrame)
                .readinessScore(readinessScore)
                .stages(stages)
                .recommendedProjects(projects)
                .salaryBenchmark(benchmark)
                .build();
    }

    /**
     * Salary prediction model
     */
    /**
     * Salary prediction model with regional currency support and skill premiums
     */
    public SalaryBenchmark predictSalary(String role, String location, int expYears, List<String> skills) {
        String roleLower = (role != null ? role.toLowerCase() : "software engineer");
        String locLower = (location != null ? location.toLowerCase() : "remote / global");

        boolean isIndia = locLower.contains("india") || locLower.contains("apac");
        boolean isEurope = locLower.contains("europe") || locLower.contains("uk");
        boolean isIntern = roleLower.contains("intern") || roleLower.contains("trainee") || expYears == 0;

        double baseMedian;
        String currency;
        String locationFactor;
        double expMultiplier;
        double skillBonus;

        List<CompanyTierBenchmark> tiers = new ArrayList<>();

        if (isIndia) {
            currency = "INR (₹)";
            locationFactor = "India / APAC Region (Competitive Tier-1 Tech Hub)";

            if (isIntern) {
                // Realistic Indian Intern / Fresher Baseline
                baseMedian = 550000; // 5.5 LPA general market baseline
                expMultiplier = 0;
                skillBonus = 40000;

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Service & IT Companies (Mass Recruiters)")
                        .badge("SERVICE")
                        .minSalary(320000)
                        .medianSalary(380000)
                        .maxSalary(450000)
                        .monthlyStipend("₹12,000 - ₹20,000 / mo")
                        .description("Mass enterprise hiring, foundational IT services, and structured training programs.")
                        .exampleCompanies(List.of("TCS", "Infosys", "Wipro", "Cognizant", "Accenture"))
                        .build());

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Product Startups & Mid-Market")
                        .badge("STARTUP")
                        .minSalary(500000)
                        .medianSalary(700000)
                        .maxSalary(950000)
                        .monthlyStipend("₹25,000 - ₹45,000 / mo")
                        .description("Early-stage to Series B funded product startups with modern full-stack environments.")
                        .exampleCompanies(List.of("Zerodha", "Postman", "Hasura", "Kite", "Series A/B Startups"))
                        .build());

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Dream Companies (Unicorns & Tier-1 Tech)")
                        .badge("DREAM")
                        .minSalary(1000000)
                        .medianSalary(1400000)
                        .maxSalary(1800000)
                        .monthlyStipend("₹50,000 - ₹85,000 / mo")
                        .description("Top consumer unicorns and high-scale tech firms with competitive engineering compensation.")
                        .exampleCompanies(List.of("Razorpay", "Swiggy", "Zomato", "PhonePe", "Cred", "MakeMyTrip"))
                        .build());

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Super Dream (Big Tech / FAANG / HFT)")
                        .badge("SUPER DREAM")
                        .minSalary(1800000)
                        .medianSalary(2600000)
                        .maxSalary(3800000)
                        .monthlyStipend("₹1,00,000 - ₹1,60,000 / mo")
                        .description("Top-tier global multinational corporations, elite algorithmic hedge funds, and FAANG.")
                        .exampleCompanies(List.of("Google", "Microsoft", "Amazon", "Uber", "Atlassian", "Tower Research"))
                        .build());

            } else {
                // Experienced Professional
                baseMedian = 900000;
                if (roleLower.contains("senior")) baseMedian = 2000000;
                else if (roleLower.contains("lead") || roleLower.contains("architect") || roleLower.contains("principal")) baseMedian = 3400000;
                else if (roleLower.contains("full stack") || roleLower.contains("backend")) baseMedian = 1300000;
                else if (roleLower.contains("data") || roleLower.contains("ai") || roleLower.contains("ml")) baseMedian = 1600000;

                expMultiplier = 140000;
                skillBonus = 80000;

                double sBase = 450000 + expYears * 90000;
                double stBase = 800000 + expYears * 170000;
                double dBase = 1500000 + expYears * 260000;
                double sdBase = 2600000 + expYears * 420000;

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Service & IT Companies")
                        .badge("SERVICE")
                        .minSalary(Math.round(sBase * 0.85 / 25000) * 25000)
                        .medianSalary(Math.round(sBase / 25000) * 25000)
                        .maxSalary(Math.round(sBase * 1.25 / 25000) * 25000)
                        .monthlyStipend("N/A (Full-Time Role)")
                        .description("Mass enterprise tech services and corporate IT maintenance.")
                        .exampleCompanies(List.of("TCS", "Infosys", "Wipro", "Cognizant", "Accenture"))
                        .build());

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Product Startups & Scale-ups")
                        .badge("STARTUP")
                        .minSalary(Math.round(stBase * 0.85 / 25000) * 25000)
                        .medianSalary(Math.round(stBase / 25000) * 25000)
                        .maxSalary(Math.round(stBase * 1.3 / 25000) * 25000)
                        .monthlyStipend("N/A (Full-Time Role)")
                        .description("Fast-growing venture-backed product teams with equity / ESOP opportunities.")
                        .exampleCompanies(List.of("Zerodha", "Postman", "Hasura", "Groww", "Kite"))
                        .build());

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Dream Companies (Tier-1 Unicorns)")
                        .badge("DREAM")
                        .minSalary(Math.round(dBase * 0.85 / 25000) * 25000)
                        .medianSalary(Math.round(dBase / 25000) * 25000)
                        .maxSalary(Math.round(dBase * 1.35 / 25000) * 25000)
                        .monthlyStipend("N/A (Full-Time Role)")
                        .description("Top-tier product engineering firms with high performance cash + stock grants.")
                        .exampleCompanies(List.of("Razorpay", "Swiggy", "Zomato", "PhonePe", "Cred"))
                        .build());

                tiers.add(CompanyTierBenchmark.builder()
                        .tierName("Super Dream (Big Tech / FAANG)")
                        .badge("SUPER DREAM")
                        .minSalary(Math.round(sdBase * 0.85 / 25000) * 25000)
                        .medianSalary(Math.round(sdBase / 25000) * 25000)
                        .maxSalary(Math.round(sdBase * 1.4 / 25000) * 25000)
                        .monthlyStipend("N/A (Full-Time Role)")
                        .description("Top multinational tech leaders and tier-1 compensation packages.")
                        .exampleCompanies(List.of("Google", "Microsoft", "Amazon", "Uber", "Atlassian", "De Shaw"))
                        .build());
            }

        } else if (isEurope) {
            currency = "EUR (€)";
            locationFactor = "Europe / United Kingdom Tech Benchmark";
            baseMedian = isIntern ? 32000 : 65000;
            if (roleLower.contains("senior")) baseMedian = 95000;
            else if (roleLower.contains("lead") || roleLower.contains("architect") || roleLower.contains("principal")) baseMedian = 125000;
            else if (roleLower.contains("full stack") || roleLower.contains("backend")) baseMedian = 75000;
            else if (roleLower.contains("data") || roleLower.contains("ai") || roleLower.contains("ml")) baseMedian = 85000;

            expMultiplier = isIntern ? 0 : 4500;
            skillBonus = 3500;

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Standard IT & Consultancies")
                    .badge("STANDARD")
                    .minSalary(baseMedian * 0.75)
                    .medianSalary(baseMedian * 0.85)
                    .maxSalary(baseMedian * 0.95)
                    .monthlyStipend(isIntern ? "€1,200 - €1,800 / mo" : "N/A")
                    .description("European consultancies, regional agencies, and enterprise IT.")
                    .exampleCompanies(List.of("Capgemini", "Atos", "Siemens"))
                    .build());

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Venture-Backed European Startups")
                    .badge("STARTUP")
                    .minSalary(baseMedian * 0.9)
                    .medianSalary(baseMedian)
                    .maxSalary(baseMedian * 1.15)
                    .monthlyStipend(isIntern ? "€2,000 - €2,800 / mo" : "N/A")
                    .description("Berlin, London, Amsterdam seed and Series A/B tech startups.")
                    .exampleCompanies(List.of("Revolut", "Klarna", "Delivery Hero"))
                    .build());

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Dream / Tier-1 European Tech")
                    .badge("DREAM")
                    .minSalary(baseMedian * 1.1)
                    .medianSalary(baseMedian * 1.3)
                    .maxSalary(baseMedian * 1.5)
                    .monthlyStipend(isIntern ? "€3,000 - €4,500 / mo" : "N/A")
                    .description("Top-tier European unicorns and high-growth global platforms.")
                    .exampleCompanies(List.of("Spotify", "Adyen", "Booking.com"))
                    .build());

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Super Dream (US Big Tech Europe)")
                    .badge("SUPER DREAM")
                    .minSalary(baseMedian * 1.35)
                    .medianSalary(baseMedian * 1.6)
                    .maxSalary(baseMedian * 2.0)
                    .monthlyStipend(isIntern ? "€4,500 - €6,500 / mo" : "N/A")
                    .description("London, Dublin, and Zurich hubs of top US tech giants.")
                    .exampleCompanies(List.of("Google London", "Meta", "Amazon EU"))
                    .build());

        } else {
            currency = "USD ($)";
            locationFactor = locLower.contains("us") || locLower.contains("north america") 
                    ? "US / North America Tech Market" 
                    : "Global Remote Benchmark (USD)";
            baseMedian = isIntern ? 55000 : 95000;
            if (roleLower.contains("senior")) baseMedian = 140000;
            else if (roleLower.contains("lead") || roleLower.contains("architect") || roleLower.contains("principal")) baseMedian = 175000;
            else if (roleLower.contains("full stack") || roleLower.contains("backend")) baseMedian = 115000;
            else if (roleLower.contains("data") || roleLower.contains("ai") || roleLower.contains("ml")) baseMedian = 130000;

            expMultiplier = isIntern ? 0 : 8000;
            skillBonus = 5000;

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Standard Enterprise & Consultancies")
                    .badge("STANDARD")
                    .minSalary(baseMedian * 0.75)
                    .medianSalary(baseMedian * 0.85)
                    .maxSalary(baseMedian * 0.95)
                    .monthlyStipend(isIntern ? "$3,000 - $4,500 / mo" : "N/A")
                    .description("Corporate IT, government contracting, and enterprise solutions.")
                    .exampleCompanies(List.of("Deloitte", "Accenture", "IBM"))
                    .build());

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Tech Startups (YC / Seed / Series A-C)")
                    .badge("STARTUP")
                    .minSalary(baseMedian * 0.9)
                    .medianSalary(baseMedian)
                    .maxSalary(baseMedian * 1.2)
                    .monthlyStipend(isIntern ? "$4,500 - $7,000 / mo" : "N/A")
                    .description("San Francisco, New York, and remote product startups with equity.")
                    .exampleCompanies(List.of("Vercel", "Supabase", "Retool", "Linear"))
                    .build());

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Dream Companies (Public Tech & Unicorns)")
                    .badge("DREAM")
                    .minSalary(baseMedian * 1.15)
                    .medianSalary(baseMedian * 1.35)
                    .maxSalary(baseMedian * 1.6)
                    .monthlyStipend(isIntern ? "$7,000 - $9,500 / mo" : "N/A")
                    .description("Established high-scale software firms with strong RSU equity packages.")
                    .exampleCompanies(List.of("Stripe", "Datadog", "Airbnb", "Snowflake"))
                    .build());

            tiers.add(CompanyTierBenchmark.builder()
                    .tierName("Super Dream (Big Tech FAANG / HFT)")
                    .badge("SUPER DREAM")
                    .minSalary(baseMedian * 1.4)
                    .medianSalary(baseMedian * 1.7)
                    .maxSalary(baseMedian * 2.2)
                    .monthlyStipend(isIntern ? "$9,500 - $14,000 / mo" : "N/A")
                    .description("Top tier FAANG, OpenAI, and algorithmic trading firms (Jane Street, Citadel).")
                    .exampleCompanies(List.of("Google", "Meta", "Apple", "Jane Street", "Citadel"))
                    .build());
        }

        // Add experience factor
        baseMedian += expYears * expMultiplier;

        // Skill premium multipliers
        List<String> highValue = new ArrayList<>();
        if (skills != null) {
            for (String s : skills) {
                String sl = s.toLowerCase();
                if (sl.contains("kubernetes") || sl.contains("aws") || sl.contains("kafka") || sl.contains("microservices") || sl.contains("ai") || sl.contains("system design") || sl.contains("docker")) {
                    baseMedian += skillBonus;
                    highValue.add(s);
                }
            }
        }

        if (highValue.isEmpty()) {
            highValue = List.of("Kubernetes", "AWS Cloud", "Apache Kafka", "System Design", "Microservices");
        }

        double roundUnit = isIndia ? 25000 : 1000;
        double minSalary = Math.round((baseMedian * 0.82) / roundUnit) * roundUnit;
        double medianSalary = Math.round(baseMedian / roundUnit) * roundUnit;
        double maxSalary = Math.round((baseMedian * 1.28) / roundUnit) * roundUnit;

        return SalaryBenchmark.builder()
                .currency(currency)
                .minSalary(minSalary)
                .medianSalary(medianSalary)
                .maxSalary(maxSalary)
                .locationFactor(locationFactor)
                .highValueSkills(highValue)
                .tiers(tiers)
                .build();
    }

    private List<String> inferSkillsFromTitle(String title) {
        String t = title.toLowerCase();
        List<String> list = new ArrayList<>();
        if (t.contains("java")) { list.add("Java"); list.add("Spring Boot"); list.add("SQL"); }
        if (t.contains("python")) { list.add("Python"); list.add("Django"); list.add("PostgreSQL"); }
        if (t.contains("react") || t.contains("frontend")) { list.add("React"); list.add("JavaScript"); list.add("TypeScript"); list.add("CSS"); }
        if (t.contains("full stack") || t.contains("fullstack")) { list.add("React"); list.add("Node.js"); list.add("Java"); list.add("REST API"); }
        if (t.contains("devops") || t.contains("cloud")) { list.add("Docker"); list.add("Kubernetes"); list.add("AWS"); list.add("CI/CD"); }
        if (list.isEmpty()) { list.add("Java"); list.add("SQL"); list.add("Git"); list.add("REST API"); }
        return list;
    }

    private String categorizeSkill(String skill) {
        String s = skill.toLowerCase();
        if (s.contains("react") || s.contains("vue") || s.contains("angular") || s.contains("html") || s.contains("css")) return "Frontend";
        if (s.contains("java") || s.contains("spring") || s.contains("node") || s.contains("python") || s.contains("api")) return "Backend";
        if (s.contains("sql") || s.contains("mongo") || s.contains("redis") || s.contains("postgres")) return "Databases";
        if (s.contains("aws") || s.contains("docker") || s.contains("kubernetes") || s.contains("cloud") || s.contains("ci/cd")) return "Cloud & DevOps";
        return "Software Engineering";
    }

    private String estimateStudyTime(String skill) {
        String s = skill.toLowerCase();
        if (s.contains("kubernetes") || s.contains("system design") || s.contains("kafka")) return "2-3 Weeks";
        if (s.contains("docker") || s.contains("redis") || s.contains("graphql")) return "1-2 Weeks";
        return "3-7 Days";
    }

    private List<InterviewQuestion> generateInterviewQuestions(List<String> matched, List<String> missing, String jobTitle) {
        List<InterviewQuestion> list = new ArrayList<>();
        String jt = (jobTitle != null ? jobTitle.toLowerCase() : "");
        Set<String> allSkills = new HashSet<>();
        if (matched != null) matched.forEach(s -> allSkills.add(s.toLowerCase()));
        if (missing != null) missing.forEach(s -> allSkills.add(s.toLowerCase()));

        boolean isFrontend = jt.contains("react") || jt.contains("frontend") || allSkills.contains("react") || allSkills.contains("javascript");
        boolean isJava = jt.contains("java") || jt.contains("spring") || allSkills.contains("java") || allSkills.contains("spring boot");
        boolean isDevOps = jt.contains("devops") || jt.contains("cloud") || allSkills.contains("kubernetes") || allSkills.contains("aws") || allSkills.contains("docker");

        if (isFrontend) {
            list.add(InterviewQuestion.builder()
                    .topic("Frontend Performance & State Management")
                    .question("How does React's reconciliation and Virtual DOM algorithm work, and when would you optimize with useMemo or useCallback?")
                    .difficulty("Medium")
                    .sampleAnswerGuideline("Explain the diffing algorithm (O(n)), key prop significance, referential equality triggers for re-renders, and profiling using React DevTools.")
                    .build());

            list.add(InterviewQuestion.builder()
                    .topic("Architecture & Web Vitals")
                    .question("Compare Client-Side Rendering (CSR), Server-Side Rendering (SSR), and Static Site Generation (SSG) in modern web applications.")
                    .difficulty("Medium")
                    .sampleAnswerGuideline("Highlight First Contentful Paint (FCP) vs Time to Interactive (TTI), SEO implications, hydration cost, and how frameworks like Next.js balance them.")
                    .build());
        }

        if (isJava) {
            list.add(InterviewQuestion.builder()
                    .topic("Backend & Concurrency")
                    .question("How would you design an idempotent API in Spring Boot / REST to prevent duplicate financial transactions?")
                    .difficulty("Medium")
                    .sampleAnswerGuideline("Discuss unique Idempotency-Key headers, Redis distributed locks (SETNX with TTL), and database unique constraint verification in a transactional context.")
                    .build());

            list.add(InterviewQuestion.builder()
                    .topic("Database & ORM Optimization")
                    .question("Explain the JPA/Hibernate N+1 query problem and how to troubleshoot and resolve it in Spring Boot.")
                    .difficulty("Hard")
                    .sampleAnswerGuideline("Describe how lazy loading causes multiple SQL executions; resolve using JOIN FETCH, @EntityGraph, DTO projections, or batch fetching (hibernate.default_batch_fetch_size).")
                    .build());
        }

        if (isDevOps) {
            list.add(InterviewQuestion.builder()
                    .topic("Cloud & Container Orchestration")
                    .question("Explain the difference between Kubernetes Liveness, Readiness, and Startup probes, and how misconfiguration leads to cascading failures.")
                    .difficulty("Hard")
                    .sampleAnswerGuideline("Detail how Readiness probes govern traffic routing through Services while Liveness probes restart containers. Avoid checking external dependencies in Liveness probes.")
                    .build());
        }

        // General System Design & Scalability
        list.add(InterviewQuestion.builder()
                .topic("System Architecture & Scalability")
                .question("When scaling microservices, what strategies do you apply for low-latency caching vs event-driven messaging with Kafka?")
                .difficulty("Hard")
                .sampleAnswerGuideline("Differentiate read-heavy low-latency caching (Redis Cache-Aside/Write-Through) from asynchronous decoupled write operations and outbox pattern (Kafka event streams).")
                .build());

        list.add(InterviewQuestion.builder()
                .topic("Production Troubleshooting")
                .question("Explain how database connection pooling works in HikariCP and how you troubleshoot connection leak issues under high load.")
                .difficulty("Hard")
                .sampleAnswerGuideline("Mention leakDetectionThreshold, maximumPoolSize tuning, proper try-with-resources / JPA session management, and metrics logging via Micrometer/Prometheus.")
                .build());

        list.add(InterviewQuestion.builder()
                .topic("Behavioral & Leadership")
                .question("Describe a high-severity production outage or critical bug you investigated and resolved under time pressure.")
                .difficulty("Medium")
                .sampleAnswerGuideline("Use the STAR framework: Situation, Task, Action (log isolation, rollback or hotfix mitigation, metric telemetry), and Result (post-mortem, automated alerts, regression tests).")
                .build());

        return list;
    }

    /**
     * Generate customized, highly tailored cover letter for a candidate and target job opening
     */
    public String generateCoverLetter(String candidateName, String candidateTitle, List<String> candidateSkills, Integer experienceYears, String jobTitle, String company, String location, String jobDescription) {
        String name = (candidateName != null && !candidateName.isBlank()) ? candidateName.trim() : "Candidate";
        String currentRole = (candidateTitle != null && !candidateTitle.isBlank()) ? candidateTitle.trim() : (jobTitle != null ? jobTitle.trim() : "Software Engineer");
        String targetCompany = (company != null && !company.isBlank()) ? company.trim() : "Hiring Team";
        String targetRole = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle.trim() : "this opportunity";
        String targetLocation = (location != null && !location.isBlank()) ? location.trim() : "your team";
        int exp = experienceYears != null && experienceYears > 0 ? experienceYears : 3;

        List<String> skills = (candidateSkills != null && !candidateSkills.isEmpty()) ? candidateSkills : List.of("Java", "Spring Boot", "React", "Cloud Architecture", "System Design");
        String topSkills = String.join(", ", skills.stream().limit(4).collect(Collectors.toList()));

        StringBuilder sb = new StringBuilder();
        sb.append("Dear Hiring Team at ").append(targetCompany).append(",\n\n");
        sb.append("I am writing to express my strong interest in the ").append(targetRole).append(" position at ").append(targetCompany);
        if (!"your team".equalsIgnoreCase(targetLocation)) {
            sb.append(" (").append(targetLocation).append(")");
        }
        sb.append(". With over ").append(exp).append(" years of experience as a ").append(currentRole).append(" and hands-on expertise in ").append(topSkills).append(", I am confident in my ability to deliver immediate value to your team.\n\n");
        
        sb.append("Throughout my career, I have focused on designing scalable architectures, writing robust code, and delivering high-impact solutions. My technical proficiency across ").append(topSkills).append(" aligns directly with the core requirements outlined for this role at ").append(targetCompany).append(".\n\n");

        sb.append("I would welcome the opportunity to discuss how my background and engineering mindset can contribute to ").append(targetCompany).append("'s ongoing growth and technical goals.\n\n");
        sb.append("Thank you for your time and consideration.\n\n");
        sb.append("Sincerely,\n");
        sb.append(name);

        return sb.toString();
    }

    /**
     * Generate customized follow-up message from candidate to recruiter based on application stage & schedule
     */
    public String generateFollowUpMessage(
            String candidateName,
            String jobTitle,
            String company,
            String status,
            String appliedDate,
            String interviewTime,
            String interviewRound,
            String interviewMeetingLink,
            String offerDesignation,
            String offerSalary,
            String offerJoiningDate,
            String customContext
    ) {
        String name = (candidateName != null && !candidateName.isBlank()) ? candidateName.trim() : "Candidate";
        String targetCompany = (company != null && !company.isBlank()) ? company.trim() : "Hiring Team";
        String targetRole = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle.trim() : "Role";
        String stage = (status != null && !status.isBlank()) ? status.toUpperCase().trim() : "APPLIED";

        StringBuilder sb = new StringBuilder();

        switch (stage) {
            case "SHORTLISTED":
                sb.append("Dear Hiring Team at ").append(targetCompany).append(",\n\n");
                sb.append("Thank you very much for shortlisting my profile for the ").append(targetRole).append(" position! I am enthusiastic about the opportunity to contribute to ").append(targetCompany).append(".\n\n");
                sb.append("Could you please share the upcoming next steps in your recruitment process and when we might schedule the preliminary technical or hiring discussion?\n\n");
                sb.append("Looking forward to speaking with the team soon.\n\n");
                sb.append("Best regards,\n").append(name);
                break;

            case "INTERVIEW":
                sb.append("Dear Hiring Team at ").append(targetCompany).append(",\n\n");
                if (interviewTime != null && !interviewTime.isBlank()) {
                    String round = (interviewRound != null && !interviewRound.isBlank()) ? interviewRound : "Interview Round";
                    sb.append("I am writing to confirm my attendance for the upcoming ").append(round).append(" scheduled for ")
                            .append(interviewTime).append(" regarding the ").append(targetRole).append(" position.\n\n");
                    sb.append("I am thoroughly prepared and look forward to discussing how my skills and experience can drive value for ").append(targetCompany).append(". Please let me know if there are any specific materials or code samples I should have ready in advance.\n\n");
                } else {
                    sb.append("Thank you for the opportunity to interview for the ").append(targetRole).append(" position. I truly enjoyed our conversation and learning more about ").append(targetCompany).append("'s engineering roadmap and culture.\n\n");
                    sb.append("I wanted to follow up and see if there are any updates regarding the next steps or if you need any additional information from my side.\n\n");
                }
                sb.append("Thank you again for your time and consideration.\n\n");
                sb.append("Best regards,\n").append(name);
                break;

            case "OFFER":
                String desig = (offerDesignation != null && !offerDesignation.isBlank()) ? offerDesignation : targetRole;
                sb.append("Dear Hiring Team at ").append(targetCompany).append(",\n\n");
                sb.append("Thank you very much for extending the formal offer of employment for the ").append(desig).append(" position! I am honored and excited about the prospect of joining ").append(targetCompany).append(".\n\n");
                if (offerJoiningDate != null && !offerJoiningDate.isBlank()) {
                    sb.append("I have reviewed the terms and would like to confirm the target joining timeline (").append(offerJoiningDate).append(") as well as any onboarding documentation required before my start date.\n\n");
                } else {
                    sb.append("I am reviewing the offer details and look forward to finalizing the next onboarding steps with you.\n\n");
                }
                sb.append("Thank you once again for this wonderful opportunity!\n\n");
                sb.append("Warm regards,\n").append(name);
                break;

            case "REJECTED":
                sb.append("Dear Hiring Team at ").append(targetCompany).append(",\n\n");
                sb.append("Thank you for considering my application for the ").append(targetRole).append(" role and for keeping me updated.\n\n");
                sb.append("While I understand the decision for this specific opening, I have great admiration for ").append(targetCompany).append(" and would love to stay in touch for future opportunities where my background may be a strong fit.\n\n");
                sb.append("Wishing you and the team continued success!\n\n");
                sb.append("Best regards,\n").append(name);
                break;

            case "APPLIED":
            case "SAVED":
            default:
                sb.append("Dear Hiring Team at ").append(targetCompany).append(",\n\n");
                if (appliedDate != null && !appliedDate.isBlank()) {
                    sb.append("I hope this message finds you well. I submitted my application for the ").append(targetRole)
                            .append(" role on ").append(appliedDate).append(".\n\n");
                } else {
                    sb.append("I hope this message finds you well. I recently submitted my application for the ").append(targetRole)
                            .append(" role at ").append(targetCompany).append(".\n\n");
                }
                sb.append("I wanted to politely follow up to check if you have had an opportunity to review my profile, and to reiterate my strong enthusiasm for this position at ").append(targetCompany).append(".\n\n");
                sb.append("Please let me know if you would like me to provide any additional details, portfolio links, or references. I would welcome the chance to speak with you.\n\n");
                sb.append("Thank you for your time and consideration!\n\n");
                sb.append("Sincerely,\n").append(name);
                break;
        }

        return sb.toString();
    }
}
