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

  // Default profile if not set
  return {
    skills: [
      "React",
      "JavaScript",
      "Java",
      "Spring Boot",
      "MySQL",
      "Git",
      "Docker",
    ],
    jobTitle: "Full Stack Developer",
    experience: 3,
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

  if (!job || !job.description) return 0;

  const requiredSkills = extractSkillsFromJob(job.description);
  if (requiredSkills.length === 0) return 50; // Default if we can't extract skills

  const matchedSkills = requiredSkills.filter((skill) =>
    userSkills.some(
      (userSkill) => userSkill.toLowerCase() === skill.toLowerCase(),
    ),
  );

  const matchPercentage = Math.round(
    (matchedSkills.length / requiredSkills.length) * 100,
  );

  return Math.min(100, matchPercentage + 10); // Add small buffer for other factors
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

  const requiredSkills = extractSkillsFromJob(job.description || "");

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
  let probability = matchPercentage * 0.6; // 60% weighted on match

  if (skillGap && skillGap.totalRequired > 0) {
    // Add bonus for high skill coverage
    const coverage = skillGap.totalMatched / skillGap.totalRequired;
    const coverageBonus = coverage * 40; // Up to 40% bonus
    probability += coverageBonus;
  }

  // Add randomness to make it realistic (±5%)
  const randomVariance = (Math.random() - 0.5) * 10;
  probability += randomVariance;

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
  return "LOW";
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

export default {
  extractSkillsFromJob,
  getUserProfile,
  calculateMatchPercentage,
  getSkillGap,
  calculateInterviewProbability,
  getConfidenceLevel,
  getConfidenceColor,
  enrichJobWithAnalysis,
  saveUserProfile,
};
