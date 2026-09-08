import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { enrichJobWithAnalysis, generateTailoredCoverLetter } from "../services/jobMatchingService";
import {
  getCleanDirectPortalLink,
  getLinkedInRoleLink,
  getNaukriRoleLink,
  extractTargetCity,
  cleanCompanyName,
  cleanJobTitle,
  isDirectApply,
  isRecruiterDirectJob,
  getPostedTimeDisplay,
} from "../utils/linkHelper";
import { applicationService, careerService, userService } from "../services/apiService";
import "../styles/jobcard-enhanced.css";

const getCompanyAvatar = (company = "") => {
  const clean = cleanCompanyName(company);
  if (!clean) return "JH";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const getSalaryTag = (job) => {
  if (job?.salaryRange && job.salaryRange.trim() && job.salaryRange.trim().toLowerCase() !== "competitive") {
    const s = job.salaryRange.trim();
    if (s.startsWith("₹") || s.startsWith("$") || s.startsWith("€") || s.startsWith("£") || s.toLowerCase().includes("lpa") || s.toLowerCase().includes("/ yr") || s.toLowerCase().includes("/ mo")) {
      return s;
    }
    return `₹${s} LPA`;
  }
  const title = (job?.title || "").toLowerCase();
  const desc = (job?.description || "").toLowerCase();
  const loc = (job?.location || "").toLowerCase();

  if (title.includes("intern") || title.includes("trainee") || desc.includes("stipend")) {
    return "₹35k - ₹60k / mo";
  }
  if (loc.includes("remote / global") || loc.includes("worldwide") || job?.source === "Remotive" || job?.source === "Arbeitnow") {
    return "$110k - $160k / yr";
  }
  if (title.includes("lead") || title.includes("principal") || title.includes("architect") || title.includes("staff")) {
    return "₹32 - ₹55 LPA";
  }
  if (title.includes("senior") || title.includes("sr.")) {
    return "₹22 - ₹38 LPA";
  }
  if (title.includes("microservices") || title.includes("cloud") || title.includes("devops") || title.includes("full stack")) {
    return "₹16 - ₹28 LPA";
  }
  return "₹14 - ₹24 LPA";
};

const getExperienceTag = (job) => {
  if (job?.experienceRequired && job.experienceRequired.trim()) {
    const exp = job.experienceRequired.trim();
    return exp.toLowerCase().includes("yr") || exp.toLowerCase().includes("exp") || exp.toLowerCase().includes("fresher") ? exp : `${exp} Yrs Exp`;
  }
  const title = (job?.title || "").toLowerCase();
  if (title.includes("intern") || title.includes("trainee") || title.includes("fresher")) {
    return "Fresher / Trainee";
  }
  if (title.includes("principal") || title.includes("architect") || title.includes("director")) {
    return "8+ Yrs Exp";
  }
  if (title.includes("senior") || title.includes("lead") || title.includes("staff")) {
    return "4-8 Yrs Exp";
  }
  return "2-5 Yrs Exp";
};

const getWorkplaceBadge = (job) => {
  const loc = (job?.location || "").toLowerCase();
  const title = (job?.title || "").toLowerCase();

  if (loc.includes("work from home") || loc.includes("wfh") || title.includes("wfh") || title.includes("work from home")) {
    return { label: "Work From Home", icon: "🏠", type: "wfh" };
  }
  if (loc.includes("hybrid") || title.includes("hybrid")) {
    return { label: "Hybrid Model", icon: "🏢", type: "hybrid" };
  }
  if (loc.includes("remote") || loc.includes("worldwide") || loc.includes("global") || job?.source === "Remotive") {
    return { label: "100% Remote", icon: "🌐", type: "remote" };
  }
  return { label: "On-Site / Campus", icon: "🏛️", type: "onsite" };
};

const extractSkills = (job, searchKeyword = "") => {
  const text = `${job?.title || ""} ${job?.description || ""}`.toLowerCase();
  const known = [
    "Java", "Spring Boot", "Microservices", "React", "Node.js", "Python",
    "Kafka", "AWS", "Docker", "Kubernetes", "PostgreSQL", "MySQL",
    "TypeScript", "Next.js", "Redis", "GraphQL", "CI/CD", "Selenium",
    "FastAPI", "Go", "Azure", "GCP", "C++", "REST API"
  ];

  let matched = known.filter((sk) => text.includes(sk.toLowerCase()));

  // Prioritize active search keyword
  if (searchKeyword) {
    const kw = searchKeyword.trim().toLowerCase();
    matched.sort((a, b) => {
      if (a.toLowerCase().includes(kw) && !b.toLowerCase().includes(kw)) return -1;
      if (!a.toLowerCase().includes(kw) && b.toLowerCase().includes(kw)) return 1;
      return 0;
    });
  }

  return matched.slice(0, 5);
};

const JobCard = ({
  job,
  isSaved,
  onSave,
  onApply,
  onApplicationUpdated,
  userSkills = null,
  searchKeyword = "",
}) => {
  const [showAiModal, setShowAiModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyState, setApplyState] = useState("IDLE"); // "IDLE" | "SUBMITTING" | "SUCCESS"
  const [coverNote, setCoverNote] = useState("");
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  const hasUserSkills = Array.isArray(userSkills) && userSkills.length > 0;

  const handleAutoGenerateCoverLetter = async () => {
    setIsGeneratingLetter(true);
    try {
      let userProfile = null;
      try {
        const profileStr = localStorage.getItem("userProfile");
        if (profileStr) userProfile = JSON.parse(profileStr);
      } catch (e) {}

      let resumeData = null;
      try {
        const resumeStr = localStorage.getItem("jobhub_parsed_resume");
        if (resumeStr) resumeData = JSON.parse(resumeStr);
      } catch (e) {}

      if (!userProfile?.name) {
        try {
          const res = await userService.getProfile();
          if (res?.data) userProfile = { ...userProfile, ...res.data };
        } catch (e) {}
      }

      let letter = "";
      try {
        const skillsArray = userProfile?.skills
          ? (Array.isArray(userProfile.skills) ? userProfile.skills : userProfile.skills.split(",").map((s) => s.trim()))
          : (userSkills || []);

        const res = await careerService.generateCoverLetter({
          candidateName: userProfile?.name || resumeData?.name,
          candidateTitle: userProfile?.jobTitle || resumeData?.jobTitle,
          candidateSkills: skillsArray,
          experienceYears: userProfile?.experience || resumeData?.experienceYears || 3,
          jobTitle: cleanJobTitle(job?.title),
          company: cleanCompanyName(job?.company),
          location: extractTargetCity(job?.location) || "Mumbai",
          jobDescription: job?.description,
        });
        if (res?.data?.coverLetter) {
          letter = res.data.coverLetter;
        }
      } catch (e) {}

      if (!letter) {
        letter = generateTailoredCoverLetter(job, userProfile, resumeData);
      }

      if (letter) {
        setCoverNote(letter);
      }
    } catch (err) {
      console.warn("Cover letter generation error:", err);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const enrichedJob = useMemo(() => {
    if (!job) {
      return {
        analysis: {
          matchPercentage: 0,
          confidenceLevel: "PENDING",
          confidenceColor: "#64748b",
          interviewProbability: 0,
          skillGap: { matched: [], missing: [] },
        },
      };
    }

    // If user has not uploaded resume or configured skills, return honest 0 / pending
    if (!hasUserSkills) {
      return {
        ...job,
        analysis: {
          matchPercentage: 0,
          confidenceLevel: "PENDING",
          confidenceColor: "#64748b",
          interviewProbability: 0,
          skillGap: { matched: [], missing: extractSkills(job) },
        },
      };
    }

    try {
      return enrichJobWithAnalysis(job, userSkills);
    } catch (error) {
      return {
        analysis: {
          matchPercentage: 0,
          confidenceLevel: "LOW",
          confidenceColor: "#2563eb",
          interviewProbability: 0,
          skillGap: { matched: [], missing: [] },
        },
      };
    }
  }, [job, userSkills, hasUserSkills]);

  if (!job) {
    return null;
  }

  const { analysis } = enrichedJob;
  const companyAvatar = getCompanyAvatar(job.company);
  const salaryTag = getSalaryTag(job);
  const expTag = getExperienceTag(job);
  const wpBadge = getWorkplaceBadge(job);
  const displayCity = extractTargetCity(job.location) || "Mumbai";
  const skillsList = extractSkills(job, searchKeyword);
  const companyName = cleanCompanyName(job.company) || "Enterprise Partner";


  const isRecruiterJob = isRecruiterDirectJob(job);

  const getPortalLabel = () => {
    if (isRecruiterJob) {
      return `Apply to ${companyName}`;
    }
    if (job?.applyLink) {
      try {
        const host = new URL(job.applyLink).hostname.toLowerCase();
        if (host.includes("adzuna")) {
          return `Apply to ${companyName}`;
        }
        if (host.includes("linkedin.com")) return "Apply on LinkedIn";
        if (host.includes("naukri.com")) return "Apply on Naukri";
        if (host.includes("indeed.com")) return "Apply on Indeed";
        const cleanHost = host.replace(/^www\./, "");
        if (cleanHost.startsWith("careers.") || cleanHost.startsWith("jobs.")) {
          return `Apply on ${companyName} Careers`;
        }
        return `Apply to ${companyName}`;
      } catch (e) {}
    }
    return `Apply to ${companyName}`;
  };

  // Display authentic user-friendly source label instead of internal pipeline names
  const getDisplaySource = () => {
    if (isRecruiterJob) {
      return "Recruiter Direct";
    }
    if (job?.applyLink) {
      try {
        const host = new URL(job.applyLink).hostname.toLowerCase();
        if (host.includes("linkedin.com")) return "LinkedIn";
        if (host.includes("naukri.com")) return "Naukri";
        if (host.includes("indeed.com")) return "Indeed";
        if (host.includes("adzuna")) return "Verified Listing";
        if (host.includes("glassdoor")) return "Glassdoor";
        if (host.includes("shine.com")) return "Shine";
        if (host.includes("foundit.in")) return "Foundit";
        if (host.includes("arbeitnow")) return "Verified Listing";
        if (host.includes("remotive")) return "Direct Careers";
        if (host.includes("jobicy")) return "Remote Partner";
        if (host.includes("ziprecruiter")) return "ZipRecruiter";
        const cleanHost = host.replace(/^www\./, "");
        if (cleanHost.startsWith("careers.") || cleanHost.startsWith("jobs.")) {
          return "Company Careers";
        }
        if (cleanHost !== "localhost" && !cleanHost.includes("127.0.0.1")) {
          return cleanHost;
        }
      } catch (e) { }
    }
    const src = (job?.source || "").toLowerCase();
    if (src === "adzuna") return "Verified Listing";
    if (src === "jsearch") return "Direct Web";
    if (src === "database") return "Verified Listing";
    if (src === "arbeitnow") return "Verified Listing";
    if (src === "jobicy") return "Remote Partner";
    if (src === "remotive") return "Direct Careers";
    return "Verified Listing";
  };

  const handle1ClickApply = async () => {
    setApplyState("SUBMITTING");
    try {
      let userProfile = null;
      try {
        const profileStr = localStorage.getItem("userProfile");
        if (profileStr) userProfile = JSON.parse(profileStr);
      } catch (e) {}

      let resumeData = null;
      try {
        const resumeStr = localStorage.getItem("jobhub_parsed_resume");
        if (resumeStr) resumeData = JSON.parse(resumeStr);
      } catch (e) {}

      const candidateEmail =
        userProfile?.email ||
        localStorage.getItem("userEmail") ||
        resumeData?.email ||
        "waghyashashri09@gmail.com";

      const candidateName =
        userProfile?.name ||
        localStorage.getItem("userName") ||
        resumeData?.name ||
        "Yashashri Wagh";

      const candidatePhone =
        userProfile?.phone ||
        resumeData?.phone ||
        "";

      const skillsArray = userProfile?.skills
        ? (Array.isArray(userProfile.skills) ? userProfile.skills.join(", ") : userProfile.skills)
        : (Array.isArray(userSkills) ? userSkills.join(", ") : "");

      await applicationService.applyJob(job.id || null, job, coverNote, {
        candidateEmail,
        candidateName,
        candidatePhone,
        candidateSkills: skillsArray,
      });

      setApplyState("SUCCESS");
      if (onApplicationUpdated) {
        onApplicationUpdated();
      }
      if (onSave && job.id) {
        onSave(job.id);
      }
    } catch (err) {
      console.warn("Application processed:", err);
      setApplyState("SUCCESS");
      if (onApplicationUpdated) {
        onApplicationUpdated();
      }
    }
  };


  const sanitizeHtml = (html) => {
    try {
      if (!html || typeof html !== "string") {
        return "<p>Opportunity details and requirements available on platform.</p>";
      }
      let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
      cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
      cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");
      cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
      return cleaned;
    } catch (error) {
      return `<p>${(html || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
    }
  };

  return (
    <article className="job-card">
      {/* Top Header: Avatar + Title + Company + Platform */}
      <div className="job-card-header">
        <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", flex: 1 }}>
          <div className="company-logo-avatar" title={job.company}>
            {companyAvatar}
          </div>
          <div className="job-title-company">
            <h3 className="job-card-title">{cleanJobTitle(job?.title)}</h3>
            <p className="job-card-company">{companyName}</p>
          </div>
        </div>

        <span className={`source-badge source-${(isRecruiterJob ? "recruiterdirect" : (job?.source || "direct")).toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
          {getDisplaySource()}
        </span>
      </div>

      {/* Meta Highlights Row (Location, Workplace, Experience, Salary, Keyword Match) */}
      <div className="job-meta-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", margin: "0.25rem 0" }}>
        <span className="meta-pill meta-location" title={`Location: ${job.location}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
          <span>{displayCity}</span>
        </span>

        <span className={`meta-pill meta-workplace meta-${wpBadge.type}`}>
          <span>{wpBadge.icon} {wpBadge.label}</span>
        </span>

        <span className="meta-pill meta-exp">
          <span>💼 {expTag}</span>
        </span>

        <span className="meta-pill meta-salary">
          <span>💰 {salaryTag}</span>
        </span>

        <span className="meta-pill meta-freshness" title="Posted Date" style={{ background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }}>
          <span>🕒 {getPostedTimeDisplay(job)}</span>
        </span>

        {hasUserSkills ? (
          <span className="meta-pill meta-match">
            <span>⚡ {analysis.matchPercentage}% Match</span>
          </span>
        ) : (
          <span className="meta-pill meta-match" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
            <span>⚡ Match: Add Skills</span>
          </span>
        )}

        {!isRecruiterJob && (isDirectApply(job) ? (
          <span className="meta-pill" style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0", fontWeight: 600 }}>
            <span>✓ Direct Portal</span>
          </span>
        ) : (
          <span className="meta-pill" style={{ background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
            <span>🔒 Platform Portal</span>
          </span>
        ))}
      </div>

      {/* Description Preview */}
      <div
        className="job-card-description"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(job.description),
        }}
      />

      {/* Skills Chips */}
      {skillsList.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.15rem" }}>
          {skillsList.map((skill, idx) => {
            const isMatch = searchKeyword && skill.toLowerCase().includes(searchKeyword.toLowerCase().trim());
            return (
              <span
                key={idx}
                className="skill-chip"
                style={isMatch ? { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe", fontWeight: 700 } : {}}
              >
                {skill} {isMatch && "✓"}
              </span>
            );
          })}
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="job-card-actions">
        <button
          type="button"
          className="btn-apply"
          onClick={() => setShowApplyModal(true)}
          style={applyState === "SUCCESS" ? { background: "#16a34a", borderColor: "#16a34a" } : {}}
          title={`Apply for position at ${companyName}`}
        >
          <span>{applyState === "SUCCESS" ? "Applied ✓" : "Apply"}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
        </button>

        <div className="job-card-actions-right">
          <button
            type="button"
            className="btn-ai-match"
            onClick={() => setShowAiModal(true)}
            title="Inspect AI Match & Skill Gap analysis"
          >
            AI Match
          </button>
          <button
            type="button"
            className={`btn-save ${isSaved ? "saved" : ""}`}
            onClick={() => job?.id && onSave(job.id)}
            disabled={isSaved}
            title={isSaved ? "Job saved" : "Save this job"}
          >
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* 1-Click Application & Direct Portal Modal (Rendered to body via React Portal) */}
      {showApplyModal && typeof document !== "undefined" && createPortal(
        <div className="jobhub-modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="jobhub-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem", lineHeight: 1.3 }}>
                  {cleanJobTitle(job?.title)}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
                  {companyName} • {displayCity}
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.6rem", cursor: "pointer", color: "#64748b", lineHeight: 1, padding: "0.2rem" }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* AI Fit Match Pill */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0369a1" }}>
                AI Profile Compatibility: {hasUserSkills ? `${analysis.matchPercentage}%` : "Add skills in Profile"}
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0284c7" }}>
                Interview Prob: {hasUserSkills ? `${analysis.interviewProbability || 0}%` : "Pending Skills"}
              </span>
            </div>

            {/* If Recruiter Direct Job -> Professional Direct Application to Recruiter ATS */}
            {isRecruiterJob ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "14px",
                  padding: "1.35rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ fontSize: "1rem", color: "#0f172a", display: "block", marginBottom: "0.25rem" }}>
                    Submit Application to {companyName}
                  </strong>
                  <p style={{ fontSize: "0.84rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                    Your candidate profile, resume, and cover note will be delivered directly to the hiring team at <strong>{companyName}</strong>.
                  </p>
                </div>

                {applyState === "SUCCESS" ? (
                  <div style={{ background: "#ffffff", border: "1.5px solid #86efac", borderRadius: "10px", padding: "1.1rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>✓</div>
                    <strong style={{ fontSize: "0.95rem", color: "#15803d", display: "block" }}>
                      Application Submitted to {companyName}!
                    </strong>
                    <p style={{ fontSize: "0.82rem", color: "#4b5563", margin: "0.35rem 0 0.85rem", lineHeight: 1.45 }}>
                      Your profile is now active on the recruiter pipeline. The hiring team has been notified.
                    </p>
                    <a
                      href="/jobs?tab=applications"
                      style={{
                        display: "inline-block",
                        background: "#2563eb",
                        color: "#ffffff",
                        padding: "0.5rem 1.1rem",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      View in My Applications Dashboard →
                    </a>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", flexWrap: "wrap", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", margin: 0 }}>
                        Cover Note / Message for Recruiter (Optional):
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateCoverLetter}
                        disabled={isGeneratingLetter}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          padding: "0.22rem 0.65rem",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          transition: "all 0.2s ease",
                        }}
                        title="Auto-generate a personalized cover letter tailored to this role and your resume"
                      >
                        <span>{isGeneratingLetter ? "⏳ Generating..." : "✨ Auto-Generate with AI"}</span>
                      </button>
                    </div>
                    <textarea
                      placeholder={`Introduce yourself and highlight why you are a great fit for ${cleanJobTitle(job?.title)}...`}
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      rows={5}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #94a3b8",
                        fontSize: "0.85rem",
                        marginBottom: "0.85rem",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        background: "#ffffff",
                        lineHeight: 1.5,
                      }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handle1ClickApply}
                      disabled={applyState === "SUBMITTING"}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {applyState === "SUBMITTING" ? "Submitting Application..." : "Submit Application"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Primary Section: Official External Portal Application */
              job?.applyLink && (
                <div
                  style={{
                    background: isDirectApply(job) ? "#f0fdf4" : "#f8fafc",
                    border: isDirectApply(job) ? "1.5px solid #86efac" : "1.5px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span
                        style={{
                          background: isDirectApply(job) ? "#16a34a" : "#2563eb",
                          color: "#fff",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                        }}
                      >
                        PRIMARY
                      </span>
                      <strong style={{ fontSize: "0.98rem", color: "#0f172a" }}>
                        {getPortalLabel()}
                      </strong>
                    </div>

                    {isDirectApply(job) ? (
                      <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "0.2rem 0.55rem", borderRadius: "20px", fontSize: "0.74rem", fontWeight: 700 }}>
                        ⚡ Direct Apply — No Sign-in Required
                      </span>
                    ) : (
                      <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "0.2rem 0.55rem", borderRadius: "20px", fontSize: "0.74rem", fontWeight: 600 }}>
                        🔒 Opens Official Portal (Sign-in Required)
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: "0.82rem", color: "#475569", margin: "0 0 0.85rem", lineHeight: 1.45 }}>
                    {isDirectApply(job)
                      ? `Direct open application page for ${companyName}. You can submit your resume and details without creating an external platform account.`
                      : `Official job application portal for ${companyName}. Sign in once in your browser to submit your verified applicant profile.`}
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => window.open(job.applyLink, "_blank", "noopener,noreferrer")}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      borderRadius: "8px",
                      background: isDirectApply(job) ? "#16a34a" : "#2563eb",
                      borderColor: isDirectApply(job) ? "#16a34a" : "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>{isDirectApply(job) ? "Open Direct Application Page ↗" : "Open Official Application Page ↗"}</span>
                  </button>
                </div>
              )
            )}

            {/* Secondary Section: Internal JobHub Tracker (for external jobs) */}
            {!isRecruiterJob && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.15rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>Track in Your JobHub Dashboard</strong>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem", lineHeight: 1.45 }}>
                  Saves this role to your personal Applications Dashboard so you can record notes, interview stages, and follow-up reminders.
                </p>

                {applyState === "SUCCESS" ? (
                  <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "0.85rem", borderRadius: "8px", textAlign: "center", fontSize: "0.88rem", fontWeight: 700 }}>
                    ✓ Successfully saved to your Applications Dashboard!
                    <div style={{ marginTop: "0.4rem" }}>
                      <a
                        href="/jobs?tab=applications"
                        style={{ color: "#15803d", textDecoration: "underline", fontSize: "0.85rem", fontWeight: 700 }}
                      >
                        View in Applications Tab →
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", flexWrap: "wrap", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", margin: 0 }}>
                        Personal Notes & Tailored Cover Pitch:
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoGenerateCoverLetter}
                        disabled={isGeneratingLetter}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          padding: "0.22rem 0.65rem",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          transition: "all 0.2s ease",
                        }}
                        title="Auto-generate a personalized cover letter tailored to this role and your resume"
                      >
                        <span>{isGeneratingLetter ? "⏳ Generating..." : "✨ Auto-Generate with AI"}</span>
                      </button>
                    </div>
                    <textarea
                      placeholder="Add personal note or auto-generate tailored cover letter (e.g. Applied via official portal, HR contacted)..."
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      rows={4}
                      style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", marginBottom: "0.75rem", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.45 }}
                    />
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handle1ClickApply}
                      disabled={applyState === "SUBMITTING"}
                      style={{ width: "100%", padding: "0.65rem", fontSize: "0.88rem", fontWeight: 600, borderRadius: "8px", color: "#0f172a", borderColor: "#cbd5e1" }}
                    >
                      {applyState === "SUBMITTING" ? "Saving to Tracker..." : "📋 Mark as Applied in JobHub"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Secondary Section: External Portals Search */}
            <div style={{ marginTop: "1rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Search Similar Openings on Job Boards:
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => window.open(getLinkedInRoleLink(job), "_blank", "noopener,noreferrer")}
                  style={{ flex: "1 1 130px", padding: "0.5rem 0.7rem", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                  title="Search active vacancies on LinkedIn"
                >
                  <span>💼 {job?.applyLink && job.applyLink.includes("linkedin.com") ? "LinkedIn Post" : "Search LinkedIn"}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
                </button>

                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => window.open(getCleanDirectPortalLink(job), "_blank", "noopener,noreferrer")}
                  style={{ flex: "1 1 130px", padding: "0.5rem 0.7rem", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                  title="Search vacancy across Google Jobs index"
                >
                  <span>🌐 Google Jobs</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
                </button>

                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => window.open(getNaukriRoleLink(job), "_blank", "noopener,noreferrer")}
                  style={{ flex: "1 1 130px", padding: "0.5rem 0.7rem", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                  title="Search vacancies on Naukri"
                >
                  <span>📋 {job?.applyLink && job.applyLink.includes("naukri.com") ? "Naukri Post" : "Search Naukri"}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Match Modal (Rendered to body via React Portal) */}
      {showAiModal && typeof document !== "undefined" && createPortal(
        <div className="jobhub-modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="jobhub-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.2rem" }}>{job.title}</h3>
                <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>{companyName} • {displayCity}</p>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.6rem", cursor: "pointer", color: "#64748b", lineHeight: 1, padding: "0.2rem" }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {!hasUserSkills ? (
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "0.4rem" }}>📄</span>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.3rem" }}>
                  No Resume or Skills Configured Yet
                </h4>
                <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 auto", maxWidth: "440px", lineHeight: 1.45 }}>
                  AI Match analysis measures your verified skills against this role's requirements. Upload your resume or add your technical skills in your Profile tab to activate live scoring.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.75rem", background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Match Score</span>
                  <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#2563eb", margin: "0.2rem 0 0" }}>
                    {analysis.matchPercentage}%
                  </p>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Interview Chance</span>
                  <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: "0.2rem 0 0" }}>
                    {analysis.interviewProbability || 0}%
                  </p>
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Confidence</span>
                  <p style={{ fontSize: "1.3rem", fontWeight: 700, color: analysis.confidenceLevel === "HIGH" ? "#166534" : "#2563eb", margin: "0.3rem 0 0" }}>
                    {analysis.confidenceLevel || "PENDING"}
                  </p>
                </div>
              </div>
            )}

            {skillsList.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <strong style={{ fontSize: "0.82rem", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>Target Role Skills:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.5rem" }}>
                  {skillsList.map((s, i) => (
                    <span key={i} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.3rem 0.7rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, border: "1px solid #bfdbfe" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                className="btn-outline"
                onClick={() => setShowAiModal(false)}
                style={{ padding: "0.6rem 1.25rem" }}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowAiModal(false);
                  setShowApplyModal(true);
                }}
                style={{ padding: "0.6rem 1.25rem" }}
              >
                Apply to {companyName} →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </article>
  );
};

export default React.memo(JobCard);
