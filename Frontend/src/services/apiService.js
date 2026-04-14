import axiosInstance from "./axiosInstance";

export const authService = {
  login: (email, password) =>
    axiosInstance.post("/users/login", { email, password }),

  signup: (name, email, password) =>
    axiosInstance.post("/users/signup", { name, email, password }),
};

export const jobService = {
  getAllJobs: (page = 0, size = 50) =>
    axiosInstance.get("/jobs/all", { params: { page, size } }),

  /**
   * Get jobs WITH platform discovery links
   * Returns: jobs + platform search links + platform information
   */
  getJobsWithPlatforms: (keyword, location) =>
    axiosInstance.get("/jobs/discovery", { params: { keyword, location } }),

  searchJobs: (keyword = "", location = "", source = "", page = 0, size = 50) =>
    axiosInstance.get("/jobs/search", {
      params: {
        keyword: keyword || "",
        location: location || "",
        source: source || "",
        page,
        size,
      },
    }),

  getJobsBySource: (source, page = 0, size = 50) =>
    axiosInstance.get(`/jobs/source/${source}`, { params: { page, size } }),

  createJob: (job) => axiosInstance.post("/jobs/create", job),

  aggregateJobs: (keyword, location) =>
    axiosInstance.post(
      "/jobs/aggregate",
      {},
      { params: { keyword, location } },
    ),
};

export const applicationService = {
  saveJob: (jobId) => axiosInstance.post("/applications/save", { jobId }),

  updateStatus: (applicationId, status) =>
    axiosInstance.put("/applications/update-status", { applicationId, status }),

  getApplications: () => axiosInstance.get("/applications/user"),

  getUserApplications: () => axiosInstance.get("/applications/user"),
};

/**
 * User profile and skills management service
 */
export const userService = {
  /**
   * Get current user profile (requires authentication token)
   */
  getProfile: () => axiosInstance.get("/users/profile"),

  /**
   * Get user skills as array
   */
  getSkills: () => axiosInstance.get("/users/profile/skills"),

  /**
   * Update user skills and profile
   * @param {Object} profileData { skills, jobTitle, experience }
   */
  updateSkills: (profileData) =>
    axiosInstance.put("/users/profile/skills", profileData),

  /**
   * Update user skills from comma-separated string
   * @param {string} skillsString "Java, Spring Boot, React"
   * @param {string} jobTitle "Full Stack Developer"
   * @param {number} experience years of experience
   */
  updateSkillsFromString: (skillsString, jobTitle = "", experience = 0) => {
    const profileData = {
      skills: skillsString,
      jobTitle: jobTitle,
      experience: experience,
    };
    return axiosInstance.put("/users/profile/skills", profileData);
  },
};
