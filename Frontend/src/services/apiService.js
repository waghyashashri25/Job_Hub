import axiosInstance from "./axiosInstance";

export const authService = {
  login: (email, password) =>
    axiosInstance.post("/users/login", { email, password }),

  loginInit: (email, password) =>
    axiosInstance.post("/users/login-init", { email, password }),

  loginVerify: (email, otpCode) =>
    axiosInstance.post("/users/login-verify", { email, otpCode }),

  signup: (name, email, password, phone = "", countryCode = "+91", role = "USER") =>
    axiosInstance.post("/users/signup", { name, email, password, phone, countryCode, role }),

  checkDuplicate: (email, phone) =>
    axiosInstance.post("/users/check-duplicate", { email, phone }),

  sendOtp: (identifier, purpose = "REGISTRATION", name = "User", phone = "") =>
    axiosInstance.post("/users/send-otp", { identifier, purpose, name, phone }),

  verifyOtp: (identifier, purpose = "REGISTRATION", otpCode = "", phone = "") =>
    axiosInstance.post("/users/verify-otp", { identifier, purpose, otpCode, phone }),

  forgotPasswordRequest: (identifier) =>
    axiosInstance.post("/users/forgot-password/request", { identifier }),

  forgotPasswordReset: (identifier, otpCode, newPassword) =>
    axiosInstance.post("/users/forgot-password/reset", { identifier, otpCode, newPassword }),

  sendJobAlerts: () =>
    axiosInstance.post("/users/send-job-alerts"),

  directOAuth: (provider, email, name, role = "USER") =>
    axiosInstance.post("/oauth/direct-auth", { provider, email, name, role }),

  getOAuthStatus: () =>
    axiosInstance.get("/oauth/status"),
};

export const adminService = {
  getStats: () => axiosInstance.get("/admin/stats"),
  getUsers: () => axiosInstance.get("/admin/users"),
  updateUserRole: (userId, role) =>
    axiosInstance.put(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => axiosInstance.delete(`/admin/users/${userId}`),
  getApplications: () => axiosInstance.get("/admin/applications"),
  updateApplicationStatus: (id, status, notes = "") =>
    axiosInstance.put(`/admin/applications/${id}/status`, { status, notes }),
  getJobs: () => axiosInstance.get("/admin/jobs"),
  deleteJob: (jobId) => axiosInstance.delete(`/admin/jobs/${jobId}`),
  getConnectorHealth: () => axiosInstance.get("/admin/health/connectors"),
  resetAllCircuits: () => axiosInstance.post("/admin/health/connectors/reset"),
  resetCircuit: (id) => axiosInstance.post(`/admin/health/connectors/${id}/reset`),
  getSchedulerStatus: () => axiosInstance.get("/admin/scheduler"),
  toggleScheduler: () => axiosInstance.post("/admin/scheduler/toggle"),
  getAnnouncement: () => axiosInstance.get("/admin/announcement"),
  setAnnouncement: (announcement) => axiosInstance.post("/admin/announcement", { announcement }),
  exportUsersCsv: () => axiosInstance.get("/admin/export/users", { responseType: "blob" }),
  exportApplicationsCsv: () => axiosInstance.get("/admin/export/applications", { responseType: "blob" }),
};

// Ultra-responsive short search cache (3-second debouncing window)
// Prevents duplicate in-flight clicks while always reflecting fresh newly ingested opportunities
const searchMemoryCache = new Map();
const CACHE_TTL_MS = 3000; // 3 seconds

export const jobService = {
  getAllJobs: (page = 0, size = 1000) =>
    axiosInstance.get("/jobs/all", { params: { page, size } }),

  /**
   * Get jobs WITH platform discovery links
   * Returns: jobs + platform search links + platform information
   */
  getJobsWithPlatforms: (keyword, location) =>
    axiosInstance.get("/jobs/discovery", { params: { keyword, location } }),

  searchJobs: async (keyword = "", location = "", source = "", page = 0, size = 1000) => {
    const normKw = (keyword || "").trim().toLowerCase();
    const normLoc = (location || "").trim().toLowerCase();
    const normSrc = (source || "").trim().toLowerCase();
    const cacheKey = `search:${normKw}:${normLoc}:${normSrc}:${page}:${size}`;
    const cached = searchMemoryCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const response = await axiosInstance.get("/jobs/search", {
      params: {
        keyword: keyword || "",
        location: location || "",
        source: source || "",
        page,
        size,
      },
    });

    searchMemoryCache.set(cacheKey, { timestamp: now, data: response });

    // Background pre-fetch next page (page + 1) for 0ms instant page navigation
    const nextPage = page + 1;
    const nextKey = `search:${normKw}:${normLoc}:${normSrc}:${nextPage}:${size}`;
    if (!searchMemoryCache.has(nextKey)) {
      axiosInstance
        .get("/jobs/search", {
          params: {
            keyword: keyword || "",
            location: location || "",
            source: source || "",
            page: nextPage,
            size,
          },
        })
        .then((res) => {
          searchMemoryCache.set(nextKey, { timestamp: Date.now(), data: res });
        })
        .catch(() => {});
    }

    return response;
  },

  getJobsBySource: (source, page = 0, size = 250) =>
    axiosInstance.get(`/jobs/source/${source}`, { params: { page, size } }),

  createJob: (job) => axiosInstance.post("/jobs/create", job),

  getInternships: (keyword = "", location = "", page = 0, size = 250) =>
    axiosInstance.get("/jobs/internships", {
      params: { keyword: keyword || "", location: location || "", page, size },
    }),

  syncInternships: () => axiosInstance.post("/jobs/sync-internships"),

  aggregateJobs: (keyword, location) =>
    axiosInstance.post(
      "/jobs/aggregate",
      {},
      { params: { keyword, location } },
    ),
};

export const applicationService = {
  saveJob: (jobId) => axiosInstance.post("/applications/save", { jobId }),

  applyJob: (jobId, job, notes = "", candidateInfo = {}) =>
    axiosInstance.post("/applications/apply", {
      jobId,
      job,
      notes,
      candidateEmail: candidateInfo.candidateEmail || candidateInfo.email || "",
      candidateName: candidateInfo.candidateName || candidateInfo.name || "",
      candidatePhone: candidateInfo.candidatePhone || candidateInfo.phone || "",
      candidateSkills: candidateInfo.candidateSkills || candidateInfo.skills || "",
    }),

  updateStatus: (applicationId, status) =>
    axiosInstance.put("/applications/update-status", { applicationId, status }),

  updateNotes: (applicationId, notes) =>
    axiosInstance.put("/applications/update-notes", { applicationId, notes }),

  getApplications: (candidateEmail = "") => {
    let email = candidateEmail;
    if (!email) {
      try {
        const p = localStorage.getItem("userProfile");
        if (p) email = JSON.parse(p)?.email;
      } catch (e) {}
      if (!email) email = localStorage.getItem("userEmail") || "waghyashashri09@gmail.com";
    }
    return axiosInstance.get("/applications/user", { params: { email } });
  },

  getUserApplications: (candidateEmail = "") => {
    let email = candidateEmail;
    if (!email) {
      try {
        const p = localStorage.getItem("userProfile");
        if (p) email = JSON.parse(p)?.email;
      } catch (e) {}
      if (!email) email = localStorage.getItem("userEmail") || "waghyashashri09@gmail.com";
    }
    return axiosInstance.get("/applications/user", { params: { email } });
  },

  getMessages: (applicationId) =>
    axiosInstance.get(`/applications/${applicationId}/messages`),

  sendMessage: (applicationId, message, senderInfo = {}) =>
    axiosInstance.post(`/applications/${applicationId}/messages`, {
      message,
      senderEmail: senderInfo.email || senderInfo.senderEmail || "",
      senderName: senderInfo.name || senderInfo.senderName || "",
      senderRole: senderInfo.role || senderInfo.senderRole || "USER",
    }),

  downloadOfferLetter: (applicationId) =>
    axiosInstance.get(`/applications/${applicationId}/offer/download`, {
      responseType: "blob",
    }),
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

export const recruiterService = {
  getStats: () => axiosInstance.get("/recruiter/stats"),
  getMyJobs: () => axiosInstance.get("/recruiter/jobs"),
  createJob: async (jobData) => {
    searchMemoryCache.clear();
    return axiosInstance.post("/recruiter/jobs", jobData);
  },
  updateJobStatus: async (jobId, status) => {
    searchMemoryCache.clear();
    return axiosInstance.put(`/recruiter/jobs/${jobId}/status`, { status });
  },
  deleteJob: async (jobId) => {
    searchMemoryCache.clear();
    return axiosInstance.delete(`/recruiter/jobs/${jobId}`);
  },
  getApplications: () => axiosInstance.get("/recruiter/applications"),
  updateApplicationStatus: (appId, status, notes = null, recruiterRating = null) => {
    const payload = {};
    if (status) payload.status = status;
    if (notes !== null) payload.notes = notes;
    if (recruiterRating !== null) payload.recruiterRating = recruiterRating;
    return axiosInstance.put(`/recruiter/applications/${appId}/status`, payload);
  },
  scheduleInterview: (appId, scheduleData) =>
    axiosInstance.post(`/recruiter/applications/${appId}/schedule-interview`, scheduleData),
  getProfile: () => axiosInstance.get("/recruiter/profile"),
  updateProfile: (profileData) => axiosInstance.put("/recruiter/profile", profileData),
  getCandidateResume: (appId) => axiosInstance.get(`/recruiter/applications/${appId}/resume`),
  downloadCandidateResume: (appId) =>
    axiosInstance.get(`/recruiter/applications/${appId}/resume/download`, {
      responseType: "blob",
    }),
  getAiCandidateAnalysis: (appId) =>
    axiosInstance.get(`/recruiter/applications/${appId}/ai-analysis`),
  generateAndSendOffer: (appId, offerData) =>
    axiosInstance.post(`/recruiter/applications/${appId}/generate-offer`, offerData),
  downloadOfferLetter: (appId) =>
    axiosInstance.get(`/recruiter/applications/${appId}/offer/download`, {
      responseType: "blob",
    }),
  getMessages: (appId) =>
    axiosInstance.get(`/recruiter/applications/${appId}/messages`),
  sendMessage: (appId, message) =>
    axiosInstance.post(`/recruiter/applications/${appId}/messages`, { message }),
  getFollowUps: () =>
    axiosInstance.get("/recruiter/follow-ups"),
  markFollowUpAsRead: (appId) =>
    axiosInstance.put(`/recruiter/follow-ups/${appId}/read`),
  markAllFollowUpsAsRead: () =>
    axiosInstance.put("/recruiter/follow-ups/read-all"),
};

export const careerService = {
  generateCoverLetter: (data) => axiosInstance.post("/career/cover-letter", data),
  generateFollowUpMessage: (data) => axiosInstance.post("/career/follow-up-message", data),
  generateRoadmap: (data) => axiosInstance.post("/career/roadmap", data),
  predictSalary: (data) => axiosInstance.post("/career/salary-predictor", data),
  getInterviewPrep: (jobId, skills = []) =>
    axiosInstance.get(`/career/interview-prep/${jobId}`, { params: { skills } }),
};

