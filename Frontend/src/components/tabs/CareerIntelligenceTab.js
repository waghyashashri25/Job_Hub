import React, { useState, useEffect, useRef } from "react";
import resumeService from "../../services/resumeService";
import { authService } from "../../services/apiService";
import "../../styles/career-intelligence.css";

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "INR (₹)", flag: "🇮🇳", rateToINR: 1, isDefault: true },
  { code: "USD", symbol: "$", label: "USD ($)", flag: "🇺🇸", rateToINR: 86.5 },
  { code: "EUR", symbol: "€", label: "EUR (€)", flag: "🇪🇺", rateToINR: 93.0 },
  { code: "GBP", symbol: "£", label: "GBP (£)", flag: "🇬🇧", rateToINR: 110.0 },
  { code: "CAD", symbol: "C$", label: "CAD (C$)", flag: "🇨🇦", rateToINR: 63.5 },
  { code: "AUD", symbol: "A$", label: "AUD (A$)", flag: "🇦🇺", rateToINR: 56.5 },
];

const CareerIntelligenceTab = ({ jobs = [], userSkills = [], onSkillsUpdated }) => {
  const [subTab, setSubTab] = useState("resume"); // "resume", "matcher", "roadmap", "salary", "interview"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailAlertLoading, setEmailAlertLoading] = useState(false);

  // Resume State
  const [resumeData, setResumeData] = useState(() => {
    const cached = localStorage.getItem("jobhub_parsed_resume");
    return cached ? JSON.parse(cached) : null;
  });
  const [rawText, setRawText] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const fileInputRef = useRef(null);

  // Job Match State
  const [selectedJobId, setSelectedJobId] = useState(jobs.length > 0 ? jobs[0].id : null);
  const [matchAnalysis, setMatchAnalysis] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  // Roadmap State
  const [currentRole, setCurrentRole] = useState("Software Engineer");
  const [targetRole, setTargetRole] = useState("Senior Full Stack Architect");
  const [roadmapData, setRoadmapData] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  // Salary Predictor State (Defaulted to Indian Market and INR Currency)
  const [salaryRole, setSalaryRole] = useState("Software Development Intern");
  const [salaryExp, setSalaryExp] = useState(0);
  const [salaryLocation, setSalaryLocation] = useState("India / APAC");
  const [selectedCurrency, setSelectedCurrency] = useState("INR");
  const [selectedTierBadge, setSelectedTierBadge] = useState("ALL"); // "ALL", "SERVICE", "STARTUP", "DREAM", "SUPER DREAM"
  const [salaryResult, setSalaryResult] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Interview Questions Accordion
  const [openQuestionIdx, setOpenQuestionIdx] = useState(null);

  // Sync selected job with match analysis
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // Trigger match analysis when selected job changes or resume changes
  useEffect(() => {
    if (selectedJobId && subTab === "matcher") {
      runJobMatchAnalysis(selectedJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId, subTab, resumeData]);

  // Load initial roadmap and salary prediction
  useEffect(() => {
    if (subTab === "roadmap" && !roadmapData) {
      handleGenerateRoadmap();
    }
    if (subTab === "salary" && !salaryResult) {
      handlePredictSalary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  // File Upload Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await resumeService.uploadResume(file);
      if (response.data) {
        setResumeData(response.data);
        localStorage.setItem("jobhub_parsed_resume", JSON.stringify(response.data));
        setSuccessMsg(`Resume "${file.name}" successfully parsed! ATS score: ${response.data.atsEvaluation?.overallScore || 80}%`);
        if (onSkillsUpdated && response.data.allSkills?.length) {
          onSkillsUpdated(response.data.allSkills);
        }
      }
    } catch (err) {
      console.error("Resume upload error:", err);
      setError("Failed to parse resume document. Please check file format or paste plain text.");
    } finally {
      setLoading(false);
    }
  };

  // Text Parse Handler
  const handleParseRawText = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await resumeService.parseResumeText(rawText);
      if (response.data) {
        setResumeData(response.data);
        localStorage.setItem("jobhub_parsed_resume", JSON.stringify(response.data));
        setShowPasteModal(false);
        setRawText("");
        setSuccessMsg(`Resume text analyzed! Extracted ${response.data.allSkills?.length || 0} skills.`);
        if (onSkillsUpdated && response.data.allSkills?.length) {
          onSkillsUpdated(response.data.allSkills);
        }
      }
    } catch (err) {
      console.error("Text parse error:", err);
      setError("Failed to analyze resume text.");
    } finally {
      setLoading(false);
    }
  };

  // Sync Extracted Skills to User Profile
  const handleSyncToProfile = async () => {
    if (!resumeData) return;
    setLoading(true);
    try {
      await resumeService.syncToProfile(resumeData);
      if (onSkillsUpdated && resumeData.allSkills?.length) {
        onSkillsUpdated(resumeData.allSkills);
      }
      setSuccessMsg("Resume skills & experience synchronized with your candidate profile!");
    } catch (err) {
      console.error("Profile sync error:", err);
      setError("Could not sync to remote profile, saved to current session.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger AI Job Match Email Notification
  const handleEmailMatchingJobs = async () => {
    setEmailAlertLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await authService.sendJobAlerts();
      setSuccessMsg(res.data?.message || "AI job match notification email dispatched with top matching opportunities!");
    } catch (err) {
      setError(err.response?.data?.error || "Could not dispatch job match email. Please ensure your profile has skills.");
    } finally {
      setEmailAlertLoading(false);
    }
  };

  // Run Job Match Analysis
  const runJobMatchAnalysis = async (jobId) => {
    const job = jobs.find((j) => j.id === Number(jobId)) || jobs[0];
    if (!job) return;

    setMatchLoading(true);
    try {
      const skills = resumeData?.allSkills?.length ? resumeData.allSkills : userSkills;
      const expYears = resumeData?.totalExperienceYears || 2;

      const response = await resumeService.analyzeJobMatch({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        jobDescription: job.description,
        skills,
        experienceYears: expYears,
      });
      setMatchAnalysis(response.data);
    } catch (err) {
      console.error("Match analysis error:", err);
    } finally {
      setMatchLoading(false);
    }
  };

  // Generate Career Roadmap
  const handleGenerateRoadmap = async () => {
    setRoadmapLoading(true);
    try {
      const skills = resumeData?.allSkills?.length ? resumeData.allSkills : userSkills;
      const expYears = resumeData?.totalExperienceYears || 2;

      const response = await resumeService.getCareerRoadmap({
        currentRole,
        targetRole,
        skills,
        experienceYears: expYears,
      });
      setRoadmapData(response.data);
    } catch (err) {
      console.error("Roadmap error:", err);
    } finally {
      setRoadmapLoading(false);
    }
  };

  // Predict Salary
  const handlePredictSalary = async () => {
    setSalaryLoading(true);
    try {
      const skills = resumeData?.allSkills?.length ? resumeData.allSkills : userSkills;
      const response = await resumeService.predictSalary({
        role: salaryRole,
        location: salaryLocation,
        experienceYears: salaryExp,
        skills,
      });
      setSalaryResult(response.data);
    } catch (err) {
      console.error("Salary predictor error:", err);
    } finally {
      setSalaryLoading(false);
    }
  };

  // Convert & Format Salary dynamically across multiple currencies
  const convertAndFormatSalary = (amount, targetCode, originalCurrencyStr) => {
    if (!amount) return { formatted: "—", lpa: "" };

    const orig = (originalCurrencyStr || "").toUpperCase();
    let inrValue = amount;

    if (orig.includes("USD") || orig.includes("$")) {
      inrValue = amount * 86.5;
    } else if (orig.includes("EUR") || orig.includes("€")) {
      inrValue = amount * 93.0;
    } else if (orig.includes("GBP") || orig.includes("£")) {
      inrValue = amount * 110.0;
    }

    const target = CURRENCIES.find((c) => c.code === targetCode) || CURRENCIES[0];
    const converted = inrValue / target.rateToINR;

    if (targetCode === "INR") {
      const lpa = (converted / 100000).toFixed(1);
      return {
        formatted: `₹${Math.round(converted).toLocaleString("en-IN")}`,
        lpa: `₹${lpa} LPA`,
        symbol: "₹",
        converted: Math.round(converted),
      };
    }

    return {
      formatted: `${target.symbol}${Math.round(converted).toLocaleString("en-US")}`,
      lpa: `${target.symbol}${Math.round(converted).toLocaleString("en-US")} / yr`,
      symbol: target.symbol,
      converted: Math.round(converted),
    };
  };

  // Convert monthly stipend string dynamically
  const formatStipend = (stipendStr, targetCurrencyCode) => {
    if (!stipendStr || stipendStr.includes("N/A")) return null;
    if (targetCurrencyCode === "INR") return stipendStr;
    const matches = stipendStr.match(/₹([\d,]+)\s*-\s*₹([\d,]+)/);
    if (matches && matches[1] && matches[2]) {
      const minINR = parseInt(matches[1].replace(/,/g, ""), 10);
      const maxINR = parseInt(matches[2].replace(/,/g, ""), 10);
      const target = CURRENCIES.find((c) => c.code === targetCurrencyCode) || CURRENCIES[0];
      const minConv = Math.round(minINR / target.rateToINR);
      const maxConv = Math.round(maxINR / target.rateToINR);
      return `${target.symbol}${minConv.toLocaleString()} - ${target.symbol}${maxConv.toLocaleString()} / mo`;
    }
    return stipendStr;
  };

  // Badge styling for company tiers
  const getBadgeStyle = (badge) => {
    switch (badge) {
      case "SERVICE":
      case "STANDARD":
        return {
          bg: "rgba(148, 163, 184, 0.15)",
          color: "#cbd5e1",
          border: "1px solid #475569",
          icon: "🏢",
        };
      case "STARTUP":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          color: "#34d399",
          border: "1px solid #059669",
          icon: "🌱",
        };
      case "DREAM":
        return {
          bg: "rgba(129, 140, 248, 0.15)",
          color: "#a5b4fc",
          border: "1px solid #6366f1",
          icon: "⭐",
        };
      case "SUPER DREAM":
        return {
          bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.25))",
          color: "#fbbf24",
          border: "1px solid #f59e0b",
          icon: "👑",
        };
      default:
        return {
          bg: "#1e293b",
          color: "#94a3b8",
          border: "1px solid #334155",
          icon: "💼",
        };
    }
  };

  // Helper to retrieve or calculate tiered benchmarks
  const getCompanyTiers = (result, role, exp) => {
    if (result?.tiers && result.tiers.length > 0) {
      return result.tiers;
    }
    const isIntern = (role || "").toLowerCase().includes("intern") || (role || "").toLowerCase().includes("trainee") || exp === 0;
    if (isIntern) {
      return [
        {
          tierName: "Service & IT Companies (Mass Recruiters)",
          badge: "SERVICE",
          minSalary: 320000,
          medianSalary: 380000,
          maxSalary: 450000,
          monthlyStipend: "₹12,000 - ₹20,000 / mo",
          description: "Mass enterprise hiring, foundational IT services, and structured training programs.",
          exampleCompanies: ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture"],
        },
        {
          tierName: "Product Startups & Mid-Market",
          badge: "STARTUP",
          minSalary: 500000,
          medianSalary: 700000,
          maxSalary: 950000,
          monthlyStipend: "₹25,000 - ₹45,000 / mo",
          description: "Early-stage to Series B funded product startups with modern full-stack environments.",
          exampleCompanies: ["Zerodha", "Postman", "Hasura", "Kite", "Series A/B Startups"],
        },
        {
          tierName: "Dream Companies (Unicorns & Tier-1 Tech)",
          badge: "DREAM",
          minSalary: 1000000,
          medianSalary: 1400000,
          maxSalary: 1800000,
          monthlyStipend: "₹50,000 - ₹85,000 / mo",
          description: "Top consumer unicorns and high-scale tech firms with competitive engineering compensation.",
          exampleCompanies: ["Razorpay", "Swiggy", "Zomato", "PhonePe", "Cred", "MakeMyTrip"],
        },
        {
          tierName: "Super Dream (Big Tech / FAANG / HFT)",
          badge: "SUPER DREAM",
          minSalary: 1800000,
          medianSalary: 2600000,
          maxSalary: 3800000,
          monthlyStipend: "₹1,00,000 - ₹1,60,000 / mo",
          description: "Top-tier global multinational corporations, elite algorithmic hedge funds, and FAANG.",
          exampleCompanies: ["Google", "Microsoft", "Amazon", "Uber", "Atlassian", "Tower Research"],
        },
      ];
    }

    const sBase = 450000 + exp * 90000;
    const stBase = 800000 + exp * 170000;
    const dBase = 1500000 + exp * 260000;
    const sdBase = 2600000 + exp * 420000;

    return [
      {
        tierName: "Service & IT Companies",
        badge: "SERVICE",
        minSalary: sBase * 0.85,
        medianSalary: sBase,
        maxSalary: sBase * 1.25,
        monthlyStipend: "N/A (Full-Time Role)",
        description: "Mass enterprise tech services and corporate IT maintenance.",
        exampleCompanies: ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture"],
      },
      {
        tierName: "Product Startups & Scale-ups",
        badge: "STARTUP",
        minSalary: stBase * 0.85,
        medianSalary: stBase,
        maxSalary: stBase * 1.3,
        monthlyStipend: "N/A (Full-Time Role)",
        description: "Fast-growing venture-backed product teams with equity / ESOP opportunities.",
        exampleCompanies: ["Zerodha", "Postman", "Hasura", "Groww", "Kite"],
      },
      {
        tierName: "Dream Companies (Tier-1 Unicorns)",
        badge: "DREAM",
        minSalary: dBase * 0.85,
        medianSalary: dBase,
        maxSalary: dBase * 1.35,
        monthlyStipend: "N/A (Full-Time Role)",
        description: "Top-tier product engineering firms with high performance cash + stock grants.",
        exampleCompanies: ["Razorpay", "Swiggy", "Zomato", "PhonePe", "Cred"],
      },
      {
        tierName: "Super Dream (Big Tech / FAANG)",
        badge: "SUPER DREAM",
        minSalary: sdBase * 0.85,
        medianSalary: sdBase,
        maxSalary: sdBase * 1.4,
        monthlyStipend: "N/A (Full-Time Role)",
        description: "Top multinational tech leaders and tier-1 compensation packages.",
        exampleCompanies: ["Google", "Microsoft", "Amazon", "Uber", "Atlassian", "De Shaw"],
      },
    ];
  };

  const atsScore = resumeData?.atsEvaluation?.overallScore || 80;
  const atsAngle = (atsScore / 100) * 360;

  return (
    <div className="career-intelligence-hub">
      {/* Sub-Navigation (Zero Emojis, Clean SVGs) */}
      <nav className="ci-subnav">
        <button
          className={`ci-subnav-btn ${subTab === "resume" ? "active" : ""}`}
          onClick={() => setSubTab("resume")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
          <span>Resume Scanner & ATS</span>
        </button>
        <button
          className={`ci-subnav-btn ${subTab === "matcher" ? "active" : ""}`}
          onClick={() => setSubTab("matcher")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span>Job Match & Skill Gap</span>
        </button>
        <button
          className={`ci-subnav-btn ${subTab === "roadmap" ? "active" : ""}`}
          onClick={() => setSubTab("roadmap")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          <span>Career Roadmap</span>
        </button>
        <button
          className={`ci-subnav-btn ${subTab === "salary" ? "active" : ""}`}
          onClick={() => setSubTab("salary")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Salary Predictor</span>
        </button>
        <button
          className={`ci-subnav-btn ${subTab === "interview" ? "active" : ""}`}
          onClick={() => setSubTab("interview")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          <span>Interview Prep Hub</span>
        </button>
      </nav>

      {/* Notifications */}
      {error && (
        <div className="ui-alert error">
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="ui-alert success">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
        </div>
      )}

      {/* =========================================================
          VIEW 1: RESUME SCANNER & ATS INTELLIGENCE
          ========================================================= */}
      {subTab === "resume" && (
        <div className="ci-view-resume">
          {/* Upload Card */}
          <div className="ci-card">
            <div className="ci-header">
              <h2>AI Resume Scanner & ATS Optimizer</h2>
              <p>Upload your resume in PDF, DOCX, or text format to extract skills, calculate your ATS score, and receive targeted improvements.</p>
            </div>

            <div
              className="ci-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 0.75rem" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <p className="ci-upload-title">
                {loading ? "Extracting intelligence from resume..." : "Click or Drag & Drop your resume document here"}
              </p>
              <p className="ci-upload-hint">Supports PDF, DOCX, Word, and TXT formats</p>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="ci-btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Select Resume File"}
                </button>
                <button
                  className="ci-btn-secondary"
                  onClick={() => setShowPasteModal(true)}
                >
                  Paste Text
                </button>
              </div>
            </div>
          </div>

          {/* Paste Modal */}
          {showPasteModal && (
            <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: "0.75rem", fontSize: "1.25rem", fontWeight: 800 }}>Paste Resume Text</h3>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the plain text of your resume here..."
                  style={{ marginBottom: "1rem" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button className="btn-outline" onClick={() => setShowPasteModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleParseRawText} disabled={loading}>
                    {loading ? "Analyzing..." : "Analyze Resume"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Intelligence Card */}
          {resumeData && (
            <div className="ci-card">
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "2rem", alignItems: "center", marginBottom: "2rem" }}>
                {/* ATS Circle */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      background: `conic-gradient(#2563eb ${atsAngle}deg, #e2e8f0 0deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 0.75rem",
                    }}
                  >
                    <div style={{ width: "102px", height: "102px", borderRadius: "50%", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{atsScore}%</span>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>ATS Score</span>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8" }}>
                    {resumeData.atsEvaluation?.atsRating || "Competitive"}
                  </span>
                </div>

                {/* Score Breakdown */}
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                      <span>Technical Skill Keywords</span>
                      <span>{resumeData.atsEvaluation?.skillsScore || 85}%</span>
                    </div>
                    <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${resumeData.atsEvaluation?.skillsScore || 85}%`, height: "100%", background: "#2563eb", borderRadius: "999px" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                      <span>Experience & Achievements</span>
                      <span>{resumeData.atsEvaluation?.experienceScore || 80}%</span>
                    </div>
                    <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${resumeData.atsEvaluation?.experienceScore || 80}%`, height: "100%", background: "#38bdf8", borderRadius: "999px" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>
                      <span>Section Formatting & Structure</span>
                      <span>{resumeData.atsEvaluation?.formattingScore || 90}%</span>
                    </div>
                    <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${resumeData.atsEvaluation?.formattingScore || 90}%`, height: "100%", background: "#16a34a", borderRadius: "999px" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Extracted */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Extracted Technical Skills ({resumeData.allSkills?.length || 0})
                  </h3>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleEmailMatchingJobs}
                      disabled={emailAlertLoading || loading}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      title="Send instant AI-matched opportunities to your registered email"
                    >
                      {emailAlertLoading ? "Sending Email..." : "📧 Email Me Matches"}
                    </button>
                    <button className="btn-primary" onClick={handleSyncToProfile} disabled={loading} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                      Sync to Profile Matrix
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                  {(resumeData.allSkills || []).map((skill, idx) => (
                    <span key={idx} style={{ fontSize: "0.82rem", fontWeight: 600, padding: "0.3rem 0.7rem", borderRadius: "6px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          VIEW 2: JOB MATCH & SKILL GAP ANALYZER
          ========================================================= */}
      {subTab === "matcher" && (
        <div className="ci-view-matcher">
          <div className="ci-card">
            <div className="ci-header">
              <h2>Job Match & Skill Gap Analyzer</h2>
              <p>Compare your profile against any opportunity in real time to uncover matched skills and missing criteria.</p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>Select Job Listing:</label>
              <select
                value={selectedJobId || ""}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.company} ({j.location})
                  </option>
                ))}
              </select>
            </div>

            {matchAnalysis && !matchLoading && (
              <>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.2rem" }}>{matchAnalysis.jobTitle}</h3>
                    <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>{matchAnalysis.company} • {matchAnalysis.location}</p>
                  </div>
                  <div style={{ textAlign: "center", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.6rem 1.25rem", borderRadius: "10px" }}>
                    <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#2563eb", display: "block", lineHeight: 1 }}>
                      {matchAnalysis.overallMatchPercentage}%
                    </span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>Overall Match</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "1.25rem", borderRadius: "12px" }}>
                    <h4 style={{ color: "#166534", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                      Matched Skills ({matchAnalysis.matchedSkills?.length || 0})
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {matchAnalysis.matchedSkills?.map((s, idx) => (
                        <span key={idx} style={{ background: "#ffffff", color: "#166534", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "1px solid #bbf7d0" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "1.25rem", borderRadius: "12px" }}>
                    <h4 style={{ color: "#991b1b", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                      Missing Criteria ({matchAnalysis.missingCriticalSkills?.length || 0})
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {matchAnalysis.missingCriticalSkills?.map((s, idx) => (
                        <span key={idx} style={{ background: "#ffffff", color: "#991b1b", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "1px solid #fecaca" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 3: CAREER PROGRESSION ROADMAP
          ========================================================= */}
      {subTab === "roadmap" && (
        <div className="ci-view-roadmap">
          <div className="ci-card">
            <div className="ci-header">
              <h2>Career Progression Roadmap</h2>
              <p>Milestones, technical capabilities, and projects required to step into your target role.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", marginBottom: "1.75rem", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>Current Role:</label>
                <input
                  type="text"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>Target Role:</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={handleGenerateRoadmap} disabled={roadmapLoading} style={{ padding: "0.8rem 1.4rem" }}>
                {roadmapLoading ? "Updating..." : "Generate Roadmap"}
              </button>
            </div>

            {roadmapData && (
              <>
                {/* Dynamic Role Transition Summary */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                      Target Career Transition
                    </span>
                    <h3 style={{ margin: "0.2rem 0 0", color: "#0f172a", fontSize: "1.2rem", fontWeight: 800 }}>
                      {roadmapData.currentRole} → <span style={{ color: "#2563eb" }}>{roadmapData.targetRole}</span>
                    </h3>
                  </div>

                  <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Readiness Score</span>
                      <strong style={{ fontSize: "1.25rem", color: "#059669", fontWeight: 800 }}>
                        {roadmapData.readinessScore || "74%"}
                      </strong>
                    </div>

                    <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "1.25rem", textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Estimated Timeline</span>
                      <strong style={{ fontSize: "1.05rem", color: "#1d4ed8", fontWeight: 700 }}>
                        {roadmapData.estimatedTimeToTarget || "6 - 9 Months"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Milestone Stages Timeline */}
                <div className="roadmap-timeline">
                  {roadmapData.stages?.map((st) => (
                    <div key={st.stageNumber} className="roadmap-node" style={{ marginBottom: "1.5rem", padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 className="roadmap-node-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                          Stage {st.stageNumber}: {st.stageTitle}
                        </h4>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "0.25rem 0.65rem", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                          {st.timeFrame}
                        </span>
                      </div>
                      <p className="roadmap-node-desc" style={{ marginBottom: "0.85rem", color: "#475569", lineHeight: 1.5, fontSize: "0.92rem" }}>
                        {st.description}
                      </p>

                      {/* Skills to Master */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
                        {st.skillsToMaster?.map((sk, idx) => (
                          <span key={idx} style={{ fontSize: "0.78rem", fontWeight: 600, padding: "0.22rem 0.6rem", borderRadius: "6px", background: "#eff6ff", color: "#1e40af", border: "1px solid #dbeafe" }}>
                            {sk}
                          </span>
                        ))}
                      </div>

                      {/* Concrete Action Items */}
                      {st.actionItems && st.actionItems.length > 0 && (
                        <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                            Key Milestones & Action Items:
                          </span>
                          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#334155", fontSize: "0.86rem", lineHeight: 1.5 }}>
                            {st.actionItems.map((act, aIdx) => (
                              <li key={aIdx} style={{ marginBottom: "0.25rem" }}>{act}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tailored Portfolio Projects Section */}
                {roadmapData.recommendedProjects && roadmapData.recommendedProjects.length > 0 && (
                  <div style={{ marginTop: "2rem", borderTop: "2px solid #f1f5f9", paddingTop: "1.5rem" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem" }}>
                        🏆 Recommended Portfolio Projects for {roadmapData.targetRole}
                      </h3>
                      <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
                        Real-world proof-of-work projects to demonstrate verified competence to hiring managers.
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                      {roadmapData.recommendedProjects.map((proj, pIdx) => (
                        <div
                          key={pIdx}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "1.25rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                              <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "#0f172a" }}>
                                {proj.title}
                              </h4>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "4px",
                                  background: proj.difficulty === "Advanced" ? "#fef3c7" : "#ecfdf5",
                                  color: proj.difficulty === "Advanced" ? "#92400e" : "#065f46",
                                }}
                              >
                                {proj.difficulty}
                              </span>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.45, margin: "0 0 0.6rem" }}>
                              {proj.description}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                              {proj.techStack?.map((t, tIdx) => (
                                <span key={tIdx} style={{ fontSize: "0.74rem", fontWeight: 600, background: "#f1f5f9", color: "#334155", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem", fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>
                            ⭐ {proj.industryValue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 4: SALARY PREDICTOR & BENCHMARK
          ========================================================= */}
      {subTab === "salary" && (
        <div className="ci-view-salary">
          <div className="ci-card">
            <div className="ci-header">
              <h2>Market Compensation Benchmark</h2>
              <p>Estimate market salary ranges based on specialization, years of experience, and skill multipliers.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>Role Specialization:</label>
                  <input
                    type="text"
                    value={salaryRole}
                    onChange={(e) => setSalaryRole(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Experience: {salaryExp} Years
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={salaryExp}
                    onChange={(e) => setSalaryExp(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#2563eb" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>Region / Market:</label>
                  <select
                    value={salaryLocation}
                    onChange={(e) => {
                      const newLoc = e.target.value;
                      setSalaryLocation(newLoc);
                      if (newLoc.includes("India")) setSelectedCurrency("INR");
                      else if (newLoc.includes("US") || newLoc.includes("Remote")) setSelectedCurrency("USD");
                      else if (newLoc.includes("Europe")) setSelectedCurrency("EUR");
                    }}
                  >
                    <option value="India / APAC">India / APAC Region (Default - INR ₹)</option>
                    <option value="US / North America">US / North America (USD $)</option>
                    <option value="Europe / UK">Europe / United Kingdom (EUR €)</option>
                    <option value="Remote / Global">Remote (Global Benchmark)</option>
                  </select>
                </div>

                <button className="btn-primary" onClick={handlePredictSalary} disabled={salaryLoading}>
                  {salaryLoading ? "Calculating..." : "Compute Benchmark"}
                </button>
              </div>

              {salaryResult && (
                <div style={{ background: "#0f172a", color: "#ffffff", padding: "1.75rem", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)" }}>
                  {/* Currency Switcher Buttons */}
                  <div style={{ marginBottom: "1rem", textAlign: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", display: "block", marginBottom: "0.4rem" }}>
                      Switch Currency:
                    </span>
                    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.35rem" }}>
                      {CURRENCIES.map((curr) => {
                        const isActive = selectedCurrency === curr.code;
                        return (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => setSelectedCurrency(curr.code)}
                            style={{
                              padding: "0.25rem 0.55rem",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: isActive ? "1px solid #38bdf8" : "1px solid #334155",
                              background: isActive ? "linear-gradient(135deg, #0284c7, #0369a1)" : "#1e293b",
                              color: isActive ? "#ffffff" : "#cbd5e1",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span>{curr.flag}</span>
                            <span>{curr.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Company Tier Selector Pills */}
                  <div style={{ marginBottom: "1.25rem", borderTop: "1px solid #1e293b", paddingTop: "0.85rem", textAlign: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", display: "block", marginBottom: "0.45rem" }}>
                      Select Hiring Tier:
                    </span>
                    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.35rem" }}>
                      {[
                        { badge: "ALL", label: "🌟 Overall Market", icon: "🌐" },
                        { badge: "SERVICE", label: "🏢 Service / IT", icon: "🏢" },
                        { badge: "STARTUP", label: "🌱 Tech Startup", icon: "🌱" },
                        { badge: "DREAM", label: "⭐ Dream (Unicorns)", icon: "⭐" },
                        { badge: "SUPER DREAM", label: "👑 Super Dream", icon: "👑" },
                      ].map((t) => {
                        const isSelected = selectedTierBadge === t.badge;
                        return (
                          <button
                            key={t.badge}
                            type="button"
                            onClick={() => setSelectedTierBadge(t.badge)}
                            style={{
                              padding: "0.28rem 0.65rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              borderRadius: "20px",
                              border: isSelected ? "1px solid #38bdf8" : "1px solid #334155",
                              background: isSelected ? "#0284c7" : "#1e293b",
                              color: isSelected ? "#ffffff" : "#94a3b8",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(() => {
                    const tiers = getCompanyTiers(salaryResult, salaryRole, salaryExp);
                    const activeTierObj = selectedTierBadge !== "ALL" ? tiers.find((t) => t.badge === selectedTierBadge) : null;

                    const medianVal = activeTierObj ? activeTierObj.medianSalary : salaryResult.medianSalary;
                    const minVal = activeTierObj ? activeTierObj.minSalary : salaryResult.minSalary;
                    const maxVal = activeTierObj ? activeTierObj.maxSalary : salaryResult.maxSalary;

                    const median = convertAndFormatSalary(medianVal, selectedCurrency, salaryResult.currency);
                    const min = convertAndFormatSalary(minVal, selectedCurrency, salaryResult.currency);
                    const max = convertAndFormatSalary(maxVal, selectedCurrency, salaryResult.currency);

                    const stipendFormatted = activeTierObj ? formatStipend(activeTierObj.monthlyStipend, selectedCurrency) : null;
                    const bStyle = activeTierObj ? getBadgeStyle(activeTierObj.badge) : null;

                    return (
                      <div style={{ textAlign: "center" }}>
                        {activeTierObj && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.75rem", borderRadius: "12px", background: bStyle.bg, border: bStyle.border, color: bStyle.color, fontSize: "0.78rem", fontWeight: 800, marginBottom: "0.6rem" }}>
                            <span>{bStyle.icon}</span>
                            <span>{activeTierObj.tierName}</span>
                          </div>
                        )}

                        <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", display: "block" }}>
                          {activeTierObj ? `${activeTierObj.badge} Median Compensation` : "Estimated Median Compensation"}
                        </span>

                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.6rem", margin: "0.4rem 0" }}>
                          <h3 style={{ fontSize: "2.3rem", fontWeight: 900, color: "#38bdf8", margin: 0 }}>
                            {median.formatted}
                          </h3>
                          {selectedCurrency === "INR" && (
                            <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "0.18rem 0.55rem", borderRadius: "6px" }}>
                              {median.lpa}
                            </span>
                          )}
                        </div>

                        {stipendFormatted && (
                          <div style={{ margin: "0.4rem 0 0.8rem", display: "inline-block", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "0.25rem 0.75rem", color: "#7dd3fc", fontSize: "0.82rem", fontWeight: 700 }}>
                            💼 Monthly Stipend: {stipendFormatted}
                          </div>
                        )}

                        <p style={{ color: "#cbd5e1", fontSize: "0.84rem", margin: "0 0 1rem" }}>
                          {activeTierObj ? activeTierObj.description : `Median base compensation for ${salaryRole}`}
                        </p>

                        <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid #1e293b", paddingTop: "0.9rem" }}>
                          <div>
                            <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8" }}>MIN RANGE</span>
                            <strong style={{ color: "#ffffff", fontSize: "1rem" }}>
                              {min.formatted} {selectedCurrency === "INR" ? `(${min.lpa})` : ""}
                            </strong>
                          </div>
                          <div style={{ borderLeft: "1px solid #1e293b" }}></div>
                          <div>
                            <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8" }}>MAX RANGE</span>
                            <strong style={{ color: "#ffffff", fontSize: "1rem" }}>
                              {max.formatted} {selectedCurrency === "INR" ? `(${max.lpa})` : ""}
                            </strong>
                          </div>
                        </div>

                        {activeTierObj && activeTierObj.exampleCompanies && (
                          <div style={{ marginTop: "1rem", borderTop: "1px solid #1e293b", paddingTop: "0.75rem", textAlign: "left" }}>
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>
                              🏢 Benchmark Companies in this Tier:
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                              {activeTierObj.exampleCompanies.map((c, cIdx) => (
                                <span key={cIdx} style={{ fontSize: "0.74rem", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!activeTierObj || selectedTierBadge === "ALL") && salaryResult.highValueSkills && salaryResult.highValueSkills.length > 0 && (
                          <div style={{ marginTop: "1rem", borderTop: "1px solid #1e293b", paddingTop: "0.75rem", textAlign: "left" }}>
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>
                              ⚡ High-Value Skill Premiums:
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                              {salaryResult.highValueSkills.map((sk, idx) => (
                                <span key={idx} style={{ fontSize: "0.74rem", background: "rgba(56, 189, 248, 0.1)", color: "#7dd3fc", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                  + {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* =========================================================
                COMPANY TIER MATRIX BREAKDOWN (4-TIER GRID)
                ========================================================= */}
            {salaryResult && (
              <div style={{ marginTop: "2.5rem", borderTop: "2px solid #f1f5f9", paddingTop: "1.75rem" }}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "#2563eb", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.5px" }}>
                    Market Stratification & Placement Tiers
                  </span>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0.2rem 0 0.25rem" }}>
                    Tiered Hiring Landscape: Service vs Startup vs Dream vs Super Dream
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
                    Compensation structures vary drastically across company categories. Select any card to inspect that tier.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                  {getCompanyTiers(salaryResult, salaryRole, salaryExp).map((tier, idx) => {
                    const isSelected = selectedTierBadge === tier.badge;
                    const bStyle = getBadgeStyle(tier.badge);
                    const med = convertAndFormatSalary(tier.medianSalary, selectedCurrency, salaryResult.currency);
                    const min = convertAndFormatSalary(tier.minSalary, selectedCurrency, salaryResult.currency);
                    const max = convertAndFormatSalary(tier.maxSalary, selectedCurrency, salaryResult.currency);
                    const stipend = formatStipend(tier.monthlyStipend, selectedCurrency);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedTierBadge(tier.badge)}
                        style={{
                          background: isSelected ? "#0f172a" : "#ffffff",
                          color: isSelected ? "#ffffff" : "#0f172a",
                          border: isSelected ? "2px solid #38bdf8" : "1px solid #e2e8f0",
                          borderRadius: "14px",
                          padding: "1.25rem",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 8px 24px -4px rgba(56, 189, 248, 0.25)" : "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
                          transform: isSelected ? "translateY(-3px)" : "none",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <span style={{ padding: "0.2rem 0.55rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800, background: bStyle.bg, color: bStyle.color, border: bStyle.border }}>
                              {bStyle.icon} {tier.badge}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#38bdf8" }}>✓ ACTIVE</span>
                            )}
                          </div>

                          <h4 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 0.35rem", color: isSelected ? "#f8fafc" : "#0f172a" }}>
                            {tier.tierName}
                          </h4>
                          <p style={{ fontSize: "0.8rem", color: isSelected ? "#cbd5e1" : "#64748b", lineHeight: 1.4, margin: "0 0 0.75rem" }}>
                            {tier.description}
                          </p>

                          <div style={{ background: isSelected ? "#1e293b" : "#f8fafc", padding: "0.75rem", borderRadius: "8px", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.72rem", color: isSelected ? "#94a3b8" : "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                              Median Base / Package:
                            </span>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.15rem" }}>
                              <strong style={{ fontSize: "1.3rem", fontWeight: 900, color: isSelected ? "#38bdf8" : "#0284c7" }}>
                                {med.formatted}
                              </strong>
                              {selectedCurrency === "INR" && (
                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#059669" }}>
                                  ({med.lpa})
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.75rem", color: isSelected ? "#94a3b8" : "#64748b", display: "block", marginTop: "0.25rem" }}>
                              Range: {min.formatted} - {max.formatted}
                            </span>
                          </div>

                          {stipend && (
                            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: isSelected ? "#7dd3fc" : "#0284c7", background: isSelected ? "rgba(56, 189, 248, 0.1)" : "#eff6ff", padding: "0.35rem 0.6rem", borderRadius: "6px", marginBottom: "0.6rem" }}>
                              💼 Stipend: {stipend}
                            </div>
                          )}
                        </div>

                        <div>
                          <span style={{ fontSize: "0.72rem", color: isSelected ? "#94a3b8" : "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                            Top Companies:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                            {tier.exampleCompanies?.slice(0, 4).map((c, cIdx) => (
                              <span key={cIdx} style={{ fontSize: "0.7rem", fontWeight: 600, background: isSelected ? "#334155" : "#f1f5f9", color: isSelected ? "#e2e8f0" : "#334155", padding: "0.12rem 0.4rem", borderRadius: "4px" }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 5: INTERVIEW PREP HUB
          ========================================================= */}
      {subTab === "interview" && (
        <div className="ci-view-interview">
          <div className="ci-card">
            <div className="ci-header">
              <h2>Technical & System Architecture Interview Prep</h2>
              <p>Targeted interview scenarios, technical talking points, and architecture guidelines.</p>
            </div>

            {(matchAnalysis?.interviewPrepQuestions || [
              {
                topic: "System Architecture & Concurrency",
                question: "How would you design an idempotent API in Spring Boot to prevent double processing?",
                difficulty: "Medium",
                sampleAnswerGuideline: "Discuss unique Idempotency-Key headers, Redis distributed locks with TTL, and transactional verification.",
              },
              {
                topic: "Performance & Database Optimization",
                question: "Explain how database connection pooling works in HikariCP and how you troubleshoot connection leak issues.",
                difficulty: "Hard",
                sampleAnswerGuideline: "Mention leakDetectionThreshold, maximumPoolSize tuning, proper try-with-resources / JPA session management, and metrics logging.",
              },
              {
                topic: "Scalability & Microservices",
                question: "When scaling microservices, what strategies do you apply for caching vs event-driven messaging with Kafka?",
                difficulty: "Medium",
                sampleAnswerGuideline: "Differentiate read-heavy low-latency caching (Redis Write-Through/Cache-Aside) from asynchronous decoupled write operations (Kafka event streams).",
              },
            ]).map((q, idx) => (
              <div key={idx} className="qna-card">
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setOpenQuestionIdx(openQuestionIdx === idx ? null : idx)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "6px", background: "#eff6ff", color: "#1d4ed8" }}>{q.difficulty}</span>
                    <h4 className="qna-question" style={{ margin: 0 }}>{q.question}</h4>
                  </div>
                  <span style={{ fontSize: "1rem", color: "#64748b" }}>{openQuestionIdx === idx ? "▲" : "▼"}</span>
                </div>
                {openQuestionIdx === idx && (
                  <div style={{ marginTop: "0.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                    <p style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Key Talking Points:</p>
                    <p className="qna-answer">{q.sampleAnswerGuideline}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerIntelligenceTab;
