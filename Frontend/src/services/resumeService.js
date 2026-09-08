import axiosInstance from "./axiosInstance";

const resumeService = {
  /**
   * Upload resume file (PDF, DOCX, TXT)
   */
  uploadResume: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post("/resume/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Parse raw text resume
   */
  parseRawText: (text) => {
    return axiosInstance.post("/resume/parse-text", { text });
  },

  /**
   * Alias for parseRawText
   */
  parseResumeText: (text) => {
    return axiosInstance.post("/resume/parse-text", { text });
  },

  /**
   * Analyze matching between candidate resume/skills and a specific job
   */
  analyzeJobMatch: ({
    jobId,
    jobTitle,
    company,
    location,
    jobDescription,
    skills,
    experienceYears,
  }) => {
    return axiosInstance.post("/resume/analyze-job", {
      jobId,
      jobTitle,
      company,
      location,
      jobDescription,
      skills,
      experienceYears,
    });
  },

  /**
   * Save extracted resume data to user profile
   */
  syncProfile: ({ skills, jobTitle, experienceYears }) => {
    return axiosInstance.post("/resume/sync-profile", {
      skills,
      jobTitle,
      experienceYears,
    });
  },

  /**
   * Alias accepting either raw fields or full resumeData object
   */
  syncToProfile: (data) => {
    if (!data) return Promise.resolve({ data: {} });
    const payload = {
      skills: Array.isArray(data)
        ? data
        : data.skills || data.allSkills || [],
      jobTitle: data.jobTitle || data.suggestedJobTitle || "",
      experienceYears:
        data.experienceYears ?? data.totalExperienceYears ?? 2,
    };
    return axiosInstance.post("/resume/sync-profile", payload);
  },

  /**
   * Generate career progression roadmap
   */
  getCareerRoadmap: ({
    currentRole,
    targetRole,
    skills,
    experienceYears,
  }) => {
    return axiosInstance.post("/career/roadmap", {
      currentRole,
      targetRole,
      skills,
      experienceYears,
    });
  },

  /**
   * Predict market salary
   */
  predictSalary: ({ role, location, experienceYears, skills }) => {
    return axiosInstance.post("/career/salary-predictor", {
      role,
      location,
      experienceYears,
      skills,
    });
  },

  /**
   * Get tailored interview questions for a job
   */
  getInterviewPrep: (jobId = 0, skills = []) => {
    const params = skills && skills.length ? { skills: skills.join(",") } : {};
    return axiosInstance.get(`/career/interview-prep/${jobId || 0}`, { params });
  },
};

export default resumeService;
