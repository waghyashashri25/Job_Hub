/**
 * Job Matching & AI Analysis Service
 * Provides intelligent matching between user skills/profile and job requirements
 */

// Sample tech skills for demonstration
const technicalSkills = {
  frontend: [
    "React",
    "Vue",
    "Angular",
    "TypeScript",
    "JavaScript",
    "CSS",
    "HTML",
  ],
  backend: [
    "Java",
    "Spring Boot",
    "Spring",
    "Python",
    "Django",
    "Node.js",
    "Express",
    "Go",
    "Rust",
  ],
  databases: [
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "DynamoDB",
    "Elasticsearch",
  ],
  devops: [
    "Docker",
    "Kubernetes",
    "CI/CD",
    "Jenkins",
    "GitHub Actions",
    "AWS",
    "Azure",
    "GCP",
  ],
  tools: ["Git", "Linux", "REST API", "GraphQL", "Microservices"],
};

const allSkills = Object.values(technicalSkills).flat();

/**
 * Extract keywords from job description
 * @param {string} description Job description text
 * @returns {Array<string>} Found skill keywords
 */
export const extractSkillsFromJob = (description) => {
  if (!description) return [];

  const foundSkills = [];
  const lowerDesc = description.toLowerCase();

  allSkills.forEach((skill) => {
    if (lowerDesc.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });

  return [...new Set(foundSkills)]; // Remove duplicates
};

/**
 * Get user's profile from localStorage
 * Returns a default profile if not set
 * @returns {Object} User profile with skills
 */
export const getUserProfile = () => {
  try {
    const profileStr = localStorage.getItem("userProfile");
    if (profileStr) {
      return JSON.parse(profileStr);
    }
  } catch (e) {
    console.error("Error parsing user profile:", e);
  }

  // Default profile if not set - ZERO fake skills
  return {
    skills: [],
    jobTitle: "",
    experience: 0,
  };
};

/**
 * Calculate match percentage between job and user profile
 * @param {Object} job Job object
 * @param {Array<string>} userSkills User's skills
 * @returns {number} Match percentage (0-100)
 */
export const calculateMatchPercentage = (job, userSkills = null) => {
  if (!userSkills) {
    const profile = getUserProfile();
    userSkills = profile.skills || [];
  }

  // If user has not uploaded resume or configured skills, match is 0
  if (!userSkills || userSkills.length === 0) return 0;

  if (!job || !job.description) return 0;

  const requiredSkills = extractSkillsFromJob(job.description);
  if (requiredSkills.length === 0) return 0;

  const matchedSkills = requiredSkills.filter((skill) =>
    userSkills.some(
      (userSkill) => userSkill.toLowerCase() === skill.toLowerCase(),
    ),
  );

  const matchPercentage = Math.round(
    (matchedSkills.length / requiredSkills.length) * 100,
  );

  return Math.min(100, matchPercentage);
};

/**
 * Get skill gap analysis
 * @param {Object} job Job object
 * @param {Array<string>} userSkills User's skills
 * @returns {Object} Missing and matched skills
 */
export const getSkillGap = (job, userSkills = null) => {
  if (!userSkills) {
    const profile = getUserProfile();
    userSkills = profile.skills || [];
  }

  const requiredSkills = extractSkillsFromJob(job?.description || "");
  if (!userSkills || userSkills.length === 0) {
    return {
      missing: requiredSkills,
      matched: [],
      totalRequired: requiredSkills.length,
      totalMatched: 0,
    };
  }

  const missingSkills = requiredSkills.filter(
    (skill) =>
      !userSkills.some(
        (userSkill) => userSkill.toLowerCase() === skill.toLowerCase(),
      ),
  );

  const matchedSkills = requiredSkills.filter((skill) =>
    userSkills.some(
      (userSkill) => userSkill.toLowerCase() === skill.toLowerCase(),
    ),
  );

  return {
    missing: missingSkills,
    matched: matchedSkills,
    totalRequired: requiredSkills.length,
    totalMatched: matchedSkills.length,
  };
};

/**
 * Calculate interview probability based on match and skill coverage
 * @param {number} matchPercentage Match percentage
 * @param {Object} skillGap Skill gap object
 * @returns {number} Interview probability (0-100)
 */
export const calculateInterviewProbability = (
  matchPercentage,
  skillGap = null,
) => {
  if (!matchPercentage || matchPercentage === 0) return 0;
  let probability = matchPercentage * 0.6; // 60% weighted on match

  if (skillGap && skillGap.totalRequired > 0) {
    const coverage = skillGap.totalMatched / skillGap.totalRequired;
    const coverageBonus = coverage * 40; // Up to 40% bonus
    probability += coverageBonus;
  }

  return Math.min(100, Math.max(0, Math.round(probability)));
};

/**
 * Determine confidence level based on match
 * @param {number} matchPercentage Match percentage
 * @returns {string} Confidence level: LOW, MEDIUM, HIGH
 */
export const getConfidenceLevel = (matchPercentage) => {
  if (matchPercentage >= 75) return "HIGH";
  if (matchPercentage >= 50) return "MEDIUM";
  if (matchPercentage > 0) return "LOW";
  return "PENDING";
};

/**
 * Get confidence color
 * @param {string} confidenceLevel Confidence level
 * @returns {string} CSS color code
 */
export const getConfidenceColor = (confidenceLevel) => {
  switch (confidenceLevel) {
    case "HIGH":
      return "#17b890"; // Green
    case "MEDIUM":
      return "#f59e0b"; // Amber
    case "LOW":
      return "#d44f6f"; // Red
    default:
      return "#5d6785"; // Gray
  }
};

/**
 * Enrich job with AI analysis
 * @param {Object} job Job object
 * @param {Array<string>} userSkills User's skills
 * @returns {Object} Enriched job object
 */
export const enrichJobWithAnalysis = (job, userSkills = null) => {
  const matchPercentage = calculateMatchPercentage(job, userSkills);
  const skillGap = getSkillGap(job, userSkills);
  const interviewProbability = calculateInterviewProbability(
    matchPercentage,
    skillGap,
  );
  const confidenceLevel = getConfidenceLevel(matchPercentage);

  return {
    ...job,
    analysis: {
      matchPercentage,
      skillGap,
      interviewProbability,
      confidenceLevel,
      confidenceColor: getConfidenceColor(confidenceLevel),
    },
  };
};

/**
 * Generates a customized, high-converting cover letter tailoring candidate profile/resume to the job
 */
export const generateTailoredCoverLetter = (job, userProfile = null, resumeData = null) => {
  if (!job) return "";

  // 1. Candidate Info Extraction
  const name =
    userProfile?.name ||
    userProfile?.fullName ||
    resumeData?.name ||
    resumeData?.fullName ||
    "Applicant";

  const currentRole =
    userProfile?.jobTitle ||
    resumeData?.jobTitle ||
    resumeData?.title ||
    job.title ||
    "Software Engineer";

  const expYears =
    userProfile?.experience ||
    resumeData?.experienceYears ||
    resumeData?.experience ||
    3;

  // Candidate skills from Profile and Parsed Resume
  let skills = [];
  if (Array.isArray(userProfile?.skills)) {
    skills = [...userProfile.skills];
  } else if (typeof userProfile?.skills === "string") {
    skills = userProfile.skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (Array.isArray(resumeData?.skills)) {
    skills = [...new Set([...skills, ...resumeData.skills])];
  }

  // 2. Job Info Extraction
  const jobTitle = job.title || "Target Role";
  const company = job.company || "Hiring Team";
  const location = job.location || "";
  const jobSkills = extractSkillsFromJob(job.description || job.title || "");

  // Intersection of candidate skills with job skills
  const matchedSkills = skills.filter((sk) =>
    jobSkills.some((jsk) => jsk.toLowerCase() === sk.toLowerCase())
  );

  const highlightSkills = matchedSkills.length > 0 ? matchedSkills : (skills.length > 0 ? skills.slice(0, 4) : jobSkills.slice(0, 4));
  const skillsPhrase = highlightSkills.length > 0 ? highlightSkills.join(", ") : "modern engineering practices, scalable architecture, and problem solving";

  const letter = `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${jobTitle} position at ${company}${location ? ` (${location})` : ""}. With over ${expYears}+ years of experience as a ${currentRole} and practical expertise in ${skillsPhrase}, I am confident in my ability to deliver immediate value to your engineering team.

Throughout my career, I have focused on building robust, scalable solutions, maintaining high code quality, and driving technical excellence. My hands-on background in ${skillsPhrase} aligns directly with the core technical requirements outlined in your opening.

I admire ${company}'s work and culture, and I would welcome the opportunity to discuss how my skill set, enthusiasm, and track record can contribute to your team's ongoing success.

Thank you for your time and consideration.

Sincerely,
${name}`;

  return letter;
};

/**
 * Auto-frame contextual follow-up message to recruiter based on application status, elapsed date & schedule
 */
export const generateCandidateFollowUpMessage = (app, userProfile = null, resumeData = null) => {
  if (!app) return "";

  const name = userProfile?.name || resumeData?.name || localStorage.getItem("userName") || "Yashashri Wagh";
  const jobTitle = app.jobTitle || app.job?.title || "Role";
  const company = app.company || app.job?.company || "Hiring Team";
  const status = (app.status || "APPLIED").toUpperCase();

  // Format application date & days ago
  let dateText = "";
  let daysAgoText = "";
  const rawDate = app.savedAt || app.appliedDate;
  if (rawDate) {
    try {
      const d = Array.isArray(rawDate)
        ? new Date(rawDate[0], rawDate[1] - 1, rawDate[2], rawDate[3] || 0, rawDate[4] || 0)
        : new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateText = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        const diffHours = Math.floor((new Date() - d) / (1000 * 60 * 60));
        if (diffHours < 24) {
          daysAgoText = "earlier today";
        } else {
          const days = Math.floor(diffHours / 24);
          daysAgoText = days === 1 ? "yesterday" : `${days} days ago`;
        }
      }
    } catch (e) {}
  }

  const interviewTime = app.interviewTime || "";
  const interviewRound = app.interviewRound || "";
  const offerDesig = app.offerDesignation || jobTitle;
  const offerJoining = app.offerJoiningDate || "";

  switch (status) {
    case "SHORTLISTED":
      return `Dear Hiring Team at ${company},

Thank you very much for shortlisting my profile for the ${jobTitle} position! I am excited about the opportunity to contribute to ${company}.

Could you please share the next steps in your evaluation process and when we might schedule the preliminary technical or hiring discussion?

Looking forward to speaking with the team soon.

Best regards,
${name}`;

    case "INTERVIEW":
      if (interviewTime) {
        return `Dear Hiring Team at ${company},

I am writing to confirm my attendance for the upcoming ${interviewRound || "Interview Round"} scheduled for ${interviewTime} regarding the ${jobTitle} role.

I am thoroughly prepared and look forward to discussing how my background and skills can deliver value for ${company}. Please let me know if there are any specific topics or code samples I should prepare in advance.

Thank you again,
${name}`;
      } else {
        return `Dear Hiring Team at ${company},

Thank you for the opportunity to interview for the ${jobTitle} position. I truly enjoyed our conversation and learning more about ${company}'s technical roadmap and team culture.

I wanted to follow up and see if there are any updates regarding the next steps or if you need any additional materials or code samples from my side.

Thank you again for your time and consideration!

Best regards,
${name}`;
      }

    case "OFFER":
      return `Dear Hiring Team at ${company},

Thank you very much for extending the formal offer of employment for the ${offerDesig} position! I am honored and thrilled about the prospect of joining ${company}.

${offerJoining ? `I have reviewed the terms and would like to confirm the target start date (${offerJoining}) and discuss the next onboarding steps.` : "I am reviewing the offer details and look forward to finalizing the onboarding process."}

Thank you once again for this wonderful opportunity!

Warm regards,
${name}`;

    case "REJECTED":
      return `Dear Hiring Team at ${company},

Thank you for considering my application for the ${jobTitle} role and for keeping me updated.

While I understand the decision for this specific opening, I have great respect for ${company} and would love to stay in touch for future opportunities where my skills may be a strong fit.

Wishing you and the team continued success!

Best regards,
${name}`;

    case "APPLIED":
    case "SAVED":
    default:
      const timingPhrase = dateText
        ? `on ${dateText} (${daysAgoText || "recently"})`
        : "recently";

      return `Dear Hiring Team at ${company},

I hope this message finds you well. I submitted my application for the ${jobTitle} role ${timingPhrase}.

I wanted to politely follow up to check if you have had an opportunity to review my profile, and to reiterate my strong enthusiasm for this position at ${company}.

Please let me know if you would like me to provide any additional details, portfolio links, or references. I would welcome the chance to speak with you.

Thank you for your time and consideration!

Sincerely,
${name}`;
  }
};

/**
 * Save user profile
 * @param {Object} profile User profile
 */
export const saveUserProfile = (profile) => {
  try {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    return true;
  } catch (e) {
    console.error("Error saving user profile:", e);
    return false;
  }
};

const jobMatchingService = {
  extractSkillsFromJob,
  getUserProfile,
  calculateMatchPercentage,
  getSkillGap,
  calculateInterviewProbability,
  getConfidenceLevel,
  getConfidenceColor,
  enrichJobWithAnalysis,
  generateTailoredCoverLetter,
  generateCandidateFollowUpMessage,
  saveUserProfile,
};

export default jobMatchingService;

