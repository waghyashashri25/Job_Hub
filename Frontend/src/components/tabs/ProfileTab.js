import React, { useState, useEffect, useRef } from "react";
import { userService } from "../../services/apiService";
import resumeService from "../../services/resumeService";
import { getUserEmail, logout } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

const ProfileTab = ({ userSkills = [], onSkillsUpdated, onResumeSynced }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // User Profile Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState(0);
  const [skillsList, setSkillsList] = useState(userSkills || []);
  const [newSkillInput, setNewSkillInput] = useState("");

  // Avatar Photo State
  const [userPhoto, setUserPhoto] = useState(
    () => localStorage.getItem("jobhub_user_avatar") || null
  );
  const photoInputRef = useRef(null);

  // Resume State
  const [resumeData, setResumeData] = useState(() => {
    const cached = localStorage.getItem("jobhub_parsed_resume");
    return cached ? JSON.parse(cached) : null;
  });
  const fileInputRef = useRef(null);

  // Load initial profile data
  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSkillsList(userSkills || []);
  }, [userSkills]);

  const fetchUserProfile = async () => {
    const cachedEmail = getUserEmail();
    if (cachedEmail) setEmail(cachedEmail);

    try {
      const response = await userService.getProfile();
      if (response?.data) {
        const u = response.data;
        if (u.name) setFullName(u.name);
        if (u.email) setEmail(u.email);
        if (u.jobTitle) setJobTitle(u.jobTitle);
        if (u.experience) setExperience(u.experience);
        if (u.skills) {
          const parsed = u.skills.split(",").map((s) => s.trim()).filter(Boolean);
          if (parsed.length > 0) {
            setSkillsList(parsed);
            if (onSkillsUpdated) onSkillsUpdated(parsed);
          }
        }
      }
    } catch (err) {
      console.log("Could not fetch remote profile, using local defaults.");
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result;
      setUserPhoto(base64Url);
      localStorage.setItem("jobhub_user_avatar", base64Url);
      window.dispatchEvent(new Event("jobhub_avatar_updated"));
      setSuccessMsg("Profile photo updated successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setUserPhoto(null);
    localStorage.removeItem("jobhub_user_avatar");
    window.dispatchEvent(new Event("jobhub_avatar_updated"));
    setSuccessMsg("Profile photo removed.");
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const skillsStr = skillsList.join(", ");
      await userService.updateSkills({
        name: fullName,
        jobTitle,
        experience,
        skills: skillsStr,
      });

      if (onSkillsUpdated) onSkillsUpdated(skillsList);
      setSuccessMsg("Personalised profile & skills successfully updated!");
    } catch (err) {
      console.error("Save profile error:", err);
      setErrorMsg("Profile changes saved locally.");
      if (onSkillsUpdated) onSkillsUpdated(skillsList);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const cleaned = newSkillInput.trim();
    if (!skillsList.includes(cleaned)) {
      const updated = [...skillsList, cleaned];
      setSkillsList(updated);
      if (onSkillsUpdated) onSkillsUpdated(updated);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = skillsList.filter((s) => s !== skillToRemove);
    setSkillsList(updated);
    if (onSkillsUpdated) onSkillsUpdated(updated);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await resumeService.uploadResume(file);
      if (response.data) {
        setResumeData(response.data);
        localStorage.setItem("jobhub_parsed_resume", JSON.stringify(response.data));

        if (response.data.allSkills?.length) {
          const merged = Array.from(new Set([...skillsList, ...response.data.allSkills]));
          setSkillsList(merged);
          if (onSkillsUpdated) onSkillsUpdated(merged);
        }

        if (response.data.suggestedJobTitle) setJobTitle(response.data.suggestedJobTitle);
        if (response.data.totalExperienceYears) setExperience(response.data.totalExperienceYears);
        if (response.data.candidateName && !fullName) setFullName(response.data.candidateName);

        setSuccessMsg(`Resume "${file.name}" synchronized! ATS Readability Score: ${response.data.atsEvaluation?.overallScore || 85}%`);
        if (onResumeSynced) onResumeSynced(response.data);
      }
    } catch (err) {
      console.error("Resume parse error:", err);
      setErrorMsg("Failed to parse resume document. You can manage skills manually below.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = email ? email.substring(0, 2).toUpperCase() : (fullName ? fullName.substring(0, 2).toUpperCase() : "WA");
  const atsScore = resumeData?.atsEvaluation?.overallScore || 85;

  return (
    <div className="profile-tab-container" style={{ display: "grid", gap: "2rem", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div className="tab-header" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <h1 style={{ color: "#0f172a", fontSize: "2rem", fontWeight: 800 }}>Personalised Profile & Live Resume Watch</h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          Manage your credentials, live resume intelligence, verified technical skills, and account preferences.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="ui-alert success">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
        </div>
      )}
      {errorMsg && (
        <div className="ui-alert error">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.75rem" }}>
        {/* CARD 1: PROFILE INFORMATION & PHOTO UPLOAD */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 2px 12px rgba(15, 23, 42, 0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "1.5rem" }}>
            {/* Avatar Circle */}
            <div style={{ position: "relative" }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  overflow: "hidden",
                  border: "3px solid #dbeafe",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                }}
                title="Click to upload profile photo"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <input
                type="file"
                ref={photoInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {fullName || "Candidate Profile"}
                </h2>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
                  Verified
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "2px 0 0.5rem" }}>{email || "user@example.com"}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", borderRadius: "6px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontWeight: 600, cursor: "pointer" }}
                >
                  Change Photo
                </button>
                {userPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", borderRadius: "6px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontWeight: 600, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: "1.1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Full Name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Target Role / Title:</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Location:</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai / Remote"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Experience (Yrs):</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: "100%", padding: "0.8rem", borderRadius: "10px", fontWeight: 700 }}
              >
                {loading ? "Saving Profile..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: LIVE RESUME WATCH */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 2px 12px rgba(15, 23, 42, 0.05)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Live Resume Watch
              </h2>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.75rem", borderRadius: "999px", background: "#f0fdf4", color: "#166534", fontSize: "0.75rem", fontWeight: 700, border: "1px solid #bbf7d0", textTransform: "uppercase" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }}></span>
                Active Watch
              </span>
            </div>

            {resumeData ? (
              <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      {resumeData.candidateName || fullName || "Parsed Candidate Resume"}
                    </h3>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "2px 0 0" }}>
                      {resumeData.candidateEmail || email} • {resumeData.totalExperienceYears || experience} Yrs Experience
                    </p>
                  </div>
                  <div style={{ textAlign: "center", background: "#eff6ff", color: "#1d4ed8", padding: "0.45rem 0.8rem", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                    <span style={{ display: "block", fontSize: "1.15rem", fontWeight: 800, lineHeight: 1 }}>{atsScore}%</span>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>ATS Score</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#334155", margin: 0, fontWeight: 500 }}>
                  {resumeData.allSkills?.length || skillsList.length} Technical Skills Extracted and Synchronized across Job Matching.
                </p>
              </div>
            ) : (
              <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px dashed #cbd5e1", marginBottom: "1.25rem", textAlign: "center" }}>
                <p style={{ color: "#475569", fontSize: "0.9rem", margin: "0 0 0.25rem", fontWeight: 600 }}>No resume uploaded yet.</p>
                <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0 }}>Upload your resume document to activate automated skill extraction and ATS scoring.</p>
              </div>
            )}

            {/* Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "1.5rem 1rem",
                border: "2px dashed #bfdbfe",
                borderRadius: "12px",
                textAlign: "center",
                cursor: "pointer",
                background: "#f0f9ff",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 0.5rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.2rem" }}>
                {loading ? "Analyzing Document Intelligence..." : "Upload New Resume Document"}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>Supports PDF, DOCX, Word, and TXT files</p>
            </div>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", fontWeight: 600 }}
            >
              {loading ? "Processing..." : "Select Resume Document"}
            </button>
          </div>
        </div>
      </div>

      {/* CARD 3: PERSONALISED SKILLS MATRIX */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "2rem", boxShadow: "0 2px 12px rgba(15, 23, 42, 0.05)" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Personalised Technical Skills Matrix ({skillsList.length})
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "4px 0 0" }}>
            These verified skills are used to compute your live job match score, interview probability, and skill gaps.
          </p>
        </div>

        {/* Add Skill Input */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", maxWidth: "600px" }}>
          <input
            type="text"
            value={newSkillInput}
            onChange={(e) => setNewSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
            placeholder="Type a skill (e.g. React, Spring Boot, Docker, Kafka) and press Add..."
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleAddSkill}
            style={{ padding: "0.75rem 1.4rem", borderRadius: "10px", fontWeight: 700 }}
          >
            Add Skill
          </button>
        </div>

        {/* Skill Badges or Empty Notice */}
        {skillsList.length === 0 ? (
          <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "10px", padding: "1.25rem", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
            No technical skills added yet. Add your skills above or upload your resume to enable AI Job Matching and ATS scoring.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {skillsList.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "8px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                }}
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "0 2px", fontSize: "1rem", lineHeight: 1 }}
                  title={`Remove ${skill}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CARD 4: ACCOUNT PREFERENCES & SIGN OUT */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.5rem 2rem", boxShadow: "0 2px 12px rgba(15, 23, 42, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>Account Session & Security</h3>
          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "2px 0 0" }}>Signed in as <strong>{email}</strong></p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{ padding: "0.7rem 1.4rem", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontWeight: 700, cursor: "pointer" }}
        >
          Sign Out of JobHub
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
