import React, { useState, useEffect, useCallback } from "react";
import { recruiterService } from "../services/apiService";
import "../styles/admin.css";
import "../styles/recruiter.css";

const KANBAN_STAGES = [
  { id: "APPLIED", label: "Applied", color: "#2563eb", icon: "📥" },
  { id: "SHORTLISTED", label: "Shortlisted", color: "#6366f1", icon: "⭐" },
  { id: "INTERVIEW", label: "Interview", color: "#10b981", icon: "📅" },
  { id: "OFFER", label: "Offer Extended", color: "#f59e0b", icon: "🎉" },
  { id: "REJECTED", label: "Archived", color: "#ef4444", icon: "📁" },
  { id: "SAVED", label: "Bookmarked", color: "#64748b", icon: "📑" },
];

const RecruiterPortal = () => {
  const [activeTab, setActiveTab] = useState("kanban");
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    companyWebsite: "",
    companyIndustry: "",
    companyLocation: "",
  });

  // Candidate Follow-up & Notification State
  const [followUps, setFollowUps] = useState([]);
  const [followUpStats, setFollowUpStats] = useState({
    total: 0,
    unread: 0,
    waitingReply: 0,
  });
  const [followUpFilter, setFollowUpFilter] = useState("ALL");
  const [followUpSearch, setFollowUpSearch] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Job Creation Form
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobType, setJobType] = useState("Full-Time");
  const [jobSalary, setJobSalary] = useState("");
  const [jobExp, setJobExp] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [jobDesc, setJobDesc] = useState("");

  // Interview Scheduler Modal State
  const [interviewApp, setInterviewApp] = useState(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewRound, setInterviewRound] = useState("Technical Assessment");
  const [interviewNotes, setInterviewNotes] = useState("");

  // Candidate Inspector Modal State
  const [inspectCandidate, setInspectCandidate] = useState(null);

  // Resume Viewer Modal State
  const [resumeModal, setResumeModal] = useState({
    isOpen: false,
    loading: false,
    data: null,
    error: null,
  });

  // AI Analysis Modal State
  const [aiAnalysisModal, setAiAnalysisModal] = useState({
    isOpen: false,
    loading: false,
    data: null,
    candidateName: "",
    jobTitle: "",
  });

  // Offer Letter Generator Modal State
  const [offerModal, setOfferModal] = useState({
    isOpen: false,
    app: null,
    salary: "",
    designation: "",
    joiningDate: "",
    benefits: "",
    instructions: "",
  });

  // In-App Chat Modal State
  const [chatModal, setChatModal] = useState({
    isOpen: false,
    app: null,
    messages: [],
    loading: false,
    input: "",
  });

  const handleViewResume = async (appId) => {
    setResumeModal({ isOpen: true, loading: true, data: null, error: null });
    try {
      const res = await recruiterService.getCandidateResume(appId);
      setResumeModal({ isOpen: true, loading: false, data: res.data, error: null });
    } catch (err) {
      setResumeModal({
        isOpen: true,
        loading: false,
        data: null,
        error: err.response?.data?.error || "Failed to load candidate resume details",
      });
    }
  };

  const handleDownloadResume = async (appId, candidateName) => {
    setActionLoading(`resume-dl-${appId}`);
    try {
      const res = await recruiterService.downloadCandidateResume(appId);
      const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (candidateName || "Candidate").replace(/[^a-zA-Z0-9_]/g, "_");
      link.setAttribute("download", `${safeName}_Resume.doc`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage(`✓ Resume downloaded for ${candidateName || "Candidate"}`);
    } catch (err) {
      setError("Failed to download candidate resume.");
    } finally {
      setActionLoading("");
    }
  };

  const handleOpenAiAnalysis = async (app) => {
    setAiAnalysisModal({
      isOpen: true,
      loading: true,
      data: null,
      candidateName: app.user?.name || "Candidate",
      jobTitle: app.job?.title || "Role",
    });
    try {
      const res = await recruiterService.getAiCandidateAnalysis(app.id);
      setAiAnalysisModal({
        isOpen: true,
        loading: false,
        data: res.data,
        candidateName: app.user?.name || "Candidate",
        jobTitle: app.job?.title || "Role",
      });
    } catch (err) {
      setAiAnalysisModal((prev) => ({ ...prev, loading: false }));
      setError("Failed to load AI candidate match evaluation.");
    }
  };

  const handleOpenOfferModal = (app) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const dateStr = defaultDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    setOfferModal({
      isOpen: true,
      app: app,
      salary: app.offerSalary || app.job?.salaryRange || "₹24,00,000 / annum",
      designation: app.offerDesignation || app.job?.title || "Software Engineer",
      joiningDate: app.offerJoiningDate || dateStr,
      benefits: app.offerBenefits || "Comprehensive Medical Insurance, Annual Performance Incentive, Home Office Setup Allowance",
      instructions: "Please review and confirm your acceptance by replying or confirming within 7 business days.",
    });
  };

  const handleSendOfferSubmit = async (e) => {
    e.preventDefault();
    if (!offerModal.app) return;

    setActionLoading("send-offer");
    setMessage("");
    setError("");
    try {
      await recruiterService.generateAndSendOffer(offerModal.app.id, {
        salary: offerModal.salary,
        designation: offerModal.designation,
        joiningDate: offerModal.joiningDate,
        benefits: offerModal.benefits,
        instructions: offerModal.instructions,
      });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === offerModal.app.id
            ? {
                ...a,
                status: "OFFER",
                offerSalary: offerModal.salary,
                offerDesignation: offerModal.designation,
                offerJoiningDate: offerModal.joiningDate,
                offerBenefits: offerModal.benefits,
                offerSentAt: new Date().toISOString(),
              }
            : a
        )
      );

      setMessage(`✓ Formal Offer Letter dispatched to ${offerModal.app.user?.email || "candidate"}!`);
      setOfferModal({ isOpen: false, app: null, salary: "", designation: "", joiningDate: "", benefits: "", instructions: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate offer letter.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDownloadOffer = async (appId, candidateName) => {
    setActionLoading(`offer-dl-${appId}`);
    try {
      const res = await recruiterService.downloadOfferLetter(appId);
      const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (candidateName || "Candidate").replace(/[^a-zA-Z0-9_]/g, "_");
      link.setAttribute("download", `${safeName}_Offer_Letter.doc`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage(`✓ Offer letter downloaded for ${candidateName || "Candidate"}`);
    } catch (err) {
      setError("Failed to download offer letter.");
    } finally {
      setActionLoading("");
    }
  };

  const handleOpenChat = async (app) => {
    setChatModal({ isOpen: true, app, messages: [], loading: true, input: "" });
    try {
      const res = await recruiterService.getMessages(app.id);
      setChatModal({ isOpen: true, app, messages: res.data || [], loading: false, input: "" });
    } catch (err) {
      setChatModal({ isOpen: true, app, messages: [], loading: false, input: "" });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatModal.app || !chatModal.input.trim()) return;

    const messageText = chatModal.input.trim();
    setChatModal((prev) => ({ ...prev, input: "" }));
    try {
      const res = await recruiterService.sendMessage(chatModal.app.id, messageText);
      const newMsg = res.data?.message;
      if (newMsg) {
        setChatModal((prev) => ({ ...prev, messages: [...prev.messages, newMsg] }));
        setApplications((prev) =>
          prev.map((a) =>
            a.id === chatModal.app.id ? { ...a, messageCount: (a.messageCount || 0) + 1 } : a
          )
        );
      }
    } catch (err) {
      setError("Failed to send message.");
    }
  };


  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, jobsRes, appsRes, profRes, followUpsRes] = await Promise.allSettled([
        recruiterService.getStats(),
        recruiterService.getMyJobs(),
        recruiterService.getApplications(),
        recruiterService.getProfile(),
        recruiterService.getFollowUps(),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.data);
      if (appsRes.status === "fulfilled") setApplications(appsRes.value.data);
      if (profRes.status === "fulfilled") {
        setProfile((prev) => ({ ...prev, ...profRes.value.data }));
        if (profRes.value.data?.companyName && !jobCompany) {
          setJobCompany(profRes.value.data.companyName);
        }
      }
      if (followUpsRes.status === "fulfilled" && followUpsRes.value.data?.success) {
        setFollowUps(followUpsRes.value.data.followUps || []);
        setFollowUpStats({
          total: followUpsRes.value.data.totalFollowUps || 0,
          unread: followUpsRes.value.data.unreadFollowUpsCount || 0,
          waitingReply: followUpsRes.value.data.waitingReplyCount || 0,
        });
      }
    } catch (err) {
      setError("Failed to load recruiter workspace data.");
    } finally {
      setLoading(false);
    }
  }, [jobCompany]);

  // Periodic lightweight polling to auto-update candidate follow-up notification badges
  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const res = await recruiterService.getFollowUps();
        if (res.data && res.data.success) {
          setFollowUps(res.data.followUps || []);
          setFollowUpStats({
            total: res.data.totalFollowUps || 0,
            unread: res.data.unreadFollowUpsCount || 0,
            waitingReply: res.data.waitingReplyCount || 0,
          });
        }
      } catch (e) {}
    }, 12000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Mark specific candidate follow-up as read
  const handleMarkFollowUpRead = async (appId) => {
    try {
      await recruiterService.markFollowUpAsRead(appId);
      setFollowUps((prev) =>
        prev.map((f) =>
          f.applicationId === appId
            ? { ...f, isUnread: false, unreadCount: 0 }
            : f
        )
      );
      setFollowUpStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
      }));
    } catch (err) {
      console.warn("Failed to mark follow-up read:", err);
    }
  };

  // Mark all candidate follow-ups as read
  const handleMarkAllFollowUpsRead = async () => {
    try {
      await recruiterService.markAllFollowUpsAsRead();
      setFollowUps((prev) =>
        prev.map((f) => ({ ...f, isUnread: false, unreadCount: 0 }))
      );
      setFollowUpStats((prev) => ({ ...prev, unread: 0 }));
      setMessage("✓ All follow-up notifications marked as read.");
      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setError("Failed to mark all as read.");
    }
  };

  // Open Chat from Follow-up card
  const handleOpenChatFromFollowUp = (followUp) => {
    const targetApp = applications.find((a) => a.id === followUp.applicationId) || {
      id: followUp.applicationId,
      user: followUp.candidate,
      job: {
        id: followUp.jobId,
        title: followUp.jobTitle,
        company: followUp.company,
        location: followUp.location,
      },
      status: followUp.status,
    };
    handleOpenChat(targetApp);
    handleMarkFollowUpRead(followUp.applicationId);
  };

  // Filtered Follow-ups computed list
  const filteredFollowUps = React.useMemo(() => {
    return followUps.filter((f) => {
      if (followUpFilter === "WAITING" && !f.isWaitingReply) return false;
      if (followUpFilter === "UNREAD" && !f.isUnread) return false;
      if (
        followUpFilter !== "ALL" &&
        followUpFilter !== "WAITING" &&
        followUpFilter !== "UNREAD" &&
        f.status !== followUpFilter
      ) {
        return false;
      }

      if (followUpSearch && followUpSearch.trim()) {
        const q = followUpSearch.toLowerCase().trim();
        const candName = (f.candidate?.name || "").toLowerCase();
        const candEmail = (f.candidate?.email || "").toLowerCase();
        const jobT = (f.jobTitle || "").toLowerCase();
        const comp = (f.company || "").toLowerCase();
        const msg = (f.latestMessage || "").toLowerCase();
        return (
          candName.includes(q) ||
          candEmail.includes(q) ||
          jobT.includes(q) ||
          comp.includes(q) ||
          msg.includes(q)
        );
      }

      return true;
    });
  }, [followUps, followUpFilter, followUpSearch]);

  // Stage Advancement Handler
  const handleStageMove = async (appId, newStatus) => {
    setActionLoading(`stage-${appId}`);
    setMessage("");
    setError("");
    try {
      await recruiterService.updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      setMessage(`Candidate moved to ${newStatus}`);
    } catch (err) {
      setError("Failed to advance candidate stage");
    } finally {
      setActionLoading("");
    }
  };

  // Open Interview Scheduler Modal
  const handleOpenScheduler = (app) => {
    setInterviewApp(app);
    setInterviewRound("Technical Assessment");
    setMeetingLink("https://meet.google.com/new");
    setInterviewDate(new Date().toISOString().slice(0, 10));
    setInterviewTime("14:00");
    setInterviewNotes("Please be online 5 minutes before the scheduled time with your resume and code samples.");
  };

  // Submit Interview Schedule
  const handleScheduleInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!interviewApp) return;

    setActionLoading("scheduling");
    setMessage("");
    setError("");

    try {
      const combinedTime = `${interviewDate} at ${interviewTime}`;
      await recruiterService.scheduleInterview(interviewApp.id, {
        interviewTime: combinedTime,
        interviewMeetingLink: meetingLink,
        interviewRound: interviewRound,
        notes: interviewNotes,
      });

      setApplications((prev) =>
        prev.map((a) =>
          a.id === interviewApp.id
            ? {
                ...a,
                status: "INTERVIEW",
                interviewTime: combinedTime,
                interviewMeetingLink: meetingLink,
                interviewRound: interviewRound,
                notes: interviewNotes,
              }
            : a
        )
      );

      setMessage("✓ Interview scheduled & calendar invitation email dispatched to candidate!");
      setInterviewApp(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to schedule interview");
    } finally {
      setActionLoading("");
    }
  };

  // Create Job Vacancy
  const handleCreateJob = async (e) => {
    e.preventDefault();
    setActionLoading("create-job");
    setMessage("");
    setError("");

    try {
      const payload = {
        title: jobTitle,
        company: jobCompany || profile.companyName || "Employer Direct",
        location: jobLocation,
        jobType: jobType,
        salaryRange: jobSalary,
        experienceRequired: jobExp,
        skillsRequired: jobSkills,
        description: jobDesc,
      };

      await recruiterService.createJob(payload);
      setMessage("✓ Job vacancy successfully published to JobHub platform!");
      setJobTitle("");
      setJobLocation("");
      setJobSalary("");
      setJobExp("");
      setJobSkills("");
      setJobDesc("");
      loadData();
      setActiveTab("jobs");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to publish job");
    } finally {
      setActionLoading("");
    }
  };

  // Toggle Job Status (ACTIVE / CLOSED)
  const handleToggleJobStatus = async (jobId, currentStatus) => {
    setActionLoading(`job-st-${jobId}`);
    try {
      const nextStatus = currentStatus === "ACTIVE" ? "CLOSED" : "ACTIVE";
      await recruiterService.updateJobStatus(jobId, nextStatus);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j))
      );
      setMessage(`Job #${jobId} status set to ${nextStatus}`);
    } catch (err) {
      setError("Failed to update job status");
    } finally {
      setActionLoading("");
    }
  };

  // Save Recruiter Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setActionLoading("profile");
    setMessage("");
    setError("");
    try {
      await recruiterService.updateProfile(profile);
      setMessage("✓ Company & recruiter profile updated successfully!");
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <section className="recruiter-page">
      {/* Header */}
      <header className="recruiter-header">
        <div className="recruiter-header-titles">
          <div className="recruiter-badge-live">
            <span className="live-dot" />
            Recruiter &amp; Talent Workspace
          </div>
          <h1>{profile.companyName ? `${profile.companyName} Hiring Portal` : "Employer Recruitment Portal"}</h1>
          <p className="recruiter-header-subtitle">
            Manage your candidate pipeline, schedule interviews, and publish new tech vacancies directly to JobHub.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn-primary-admin"
            style={{ padding: "0.6rem 1.3rem", fontSize: "0.88rem" }}
            onClick={() => setActiveTab("new-job")}
          >
            + Post New Vacancy
          </button>
          <button
            type="button"
            className="btn-action-role"
            style={{ padding: "0.6rem 1rem", fontSize: "0.88rem" }}
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      {message && <div className="ui-alert success">{message}</div>}
      {error && <div className="ui-alert error">{error}</div>}

      {/* Navigation Tabs */}
      <nav className="recruiter-tabs-nav">
        <button
          type="button"
          className={`recruiter-tab-btn ${activeTab === "kanban" ? "active" : ""}`}
          onClick={() => setActiveTab("kanban")}
        >
          📋 ATS Kanban Board
          <span className="tab-badge">{applications.length}</span>
        </button>

        <button
          type="button"
          className={`recruiter-tab-btn ${activeTab === "follow-ups" ? "active" : ""}`}
          onClick={() => setActiveTab("follow-ups")}
          style={{ position: "relative" }}
        >
          💬 Candidate Follow-ups
          {followUpStats.unread > 0 ? (
            <span
              className="tab-badge pulse-badge"
              style={{
                background: "#ef4444",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.74rem",
                padding: "0.15rem 0.55rem",
                borderRadius: "999px",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
              }}
            >
              🔔 {followUpStats.unread} NEW
            </span>
          ) : (
            <span className="tab-badge">{followUps.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`recruiter-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Pipeline Analytics
        </button>

        <button
          type="button"
          className={`recruiter-tab-btn ${activeTab === "jobs" ? "active" : ""}`}
          onClick={() => setActiveTab("jobs")}
        >
          💼 My Job Openings
          <span className="tab-badge">{jobs.length}</span>
        </button>

        <button
          type="button"
          className={`recruiter-tab-btn ${activeTab === "new-job" ? "active" : ""}`}
          onClick={() => setActiveTab("new-job")}
        >
          ✍️ Post a Vacancy
        </button>

        <button
          type="button"
          className={`recruiter-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          🏢 Company Branding
        </button>
      </nav>

      {/* =========================================================
          TAB 1: ATS KANBAN BOARD
          ========================================================= */}
      {activeTab === "kanban" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>
              Showing {applications.length} candidate applications across 6 recruitment pipeline stages.
            </span>
          </div>

          <div className="kanban-board-container">
            {KANBAN_STAGES.map((stage) => {
              const stageApps = applications.filter(
                (a) => (a.status || "APPLIED").toUpperCase() === stage.id
              );

              return (
                <div key={stage.id} className="kanban-column">
                  <div
                    className="kanban-column-header"
                    style={{ borderTop: `4px solid ${stage.color}` }}
                  >
                    <div className="kanban-column-title">
                      <span>{stage.icon}</span>
                      <span>{stage.label}</span>
                    </div>
                    <span className="kanban-column-count">{stageApps.length}</span>
                  </div>

                  <div className="kanban-cards-list">
                    {stageApps.length > 0 ? (
                      stageApps.map((app) => (
                        <div key={app.id} className="kanban-candidate-card">
                          <div className="candidate-card-header">
                            <div>
                              <div className="candidate-name">
                                {app.user?.name || "Candidate"}
                              </div>
                              <div className="candidate-target-role">
                                {app.job?.title || "Role"}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                              <span className="candidate-card-id">#{app.id}</span>
                              <span
                                className={`ats-match-badge ${(app.matchScore || 70) >= 80 ? "high" : (app.matchScore || 70) >= 50 ? "med" : "low"}`}
                                onClick={() => handleOpenAiAnalysis(app)}
                                title="Click for AI Skills & Interview Questions"
                              >
                                ⚡ {app.matchScore || 70}%
                              </span>
                            </div>
                          </div>

                          <div className="candidate-email-row">
                            <span style={{ fontSize: "0.85rem" }}>✉️</span>
                            <span className="candidate-email-text">{app.user?.email || "No email"}</span>
                          </div>

                          {/* Extracted Skills */}
                          <div className="skills-tags-wrap">
                            {app.user?.skills ? (
                              (typeof app.user.skills === "string"
                                ? app.user.skills.split(",")
                                : app.user.skills
                              )
                                .slice(0, 3)
                                .map((s, idx) => (
                                  <span key={idx} className="tag-pill" style={{ fontSize: "0.7rem" }}>
                                    {s.trim()}
                                  </span>
                                ))
                            ) : (
                              <span className="tag-pill muted" style={{ fontSize: "0.7rem" }}>
                                General Profile
                              </span>
                            )}
                          </div>

                          {/* Interview info if scheduled */}
                          {app.interviewTime && (
                            <div className="interview-badge-card">
                              <span>📅</span>
                              <span style={{ fontSize: "0.74rem", fontWeight: 700 }}>{app.interviewTime}</span>
                            </div>
                          )}

                          {/* Clean, Neat Structured Action Block */}
                          <div className="kanban-card-action-block">
                            {/* Row 1: Resume Actions */}
                            <div className="card-btn-row">
                              <button
                                type="button"
                                className="btn-card-action btn-view-resume"
                                onClick={() => handleViewResume(app.id)}
                                title="View candidate resume & qualifications dossier"
                              >
                                <span>📄</span> View Resume
                              </button>

                              <button
                                type="button"
                                className="btn-card-action btn-dl-resume"
                                onClick={() => handleDownloadResume(app.id, app.user?.name)}
                                title="Download candidate resume as Word document"
                                disabled={actionLoading === `resume-dl-${app.id}`}
                              >
                                <span>📥</span> {actionLoading === `resume-dl-${app.id}` ? "..." : "Download"}
                              </button>
                            </div>

                            {/* Row 2: Interview & Chat */}
                            <div className="card-btn-row">
                              <button
                                type="button"
                                className="btn-card-action btn-schedule-interview"
                                onClick={() => handleOpenScheduler(app)}
                                title="Schedule interview & send automated calendar invite"
                              >
                                <span>📅</span> Schedule
                              </button>

                              <button
                                type="button"
                                className="btn-card-action btn-chat-action"
                                onClick={() => handleOpenChat(app)}
                                title="Chat directly with candidate"
                              >
                                <span>💬</span> Chat {app.messageCount > 0 ? `(${app.messageCount})` : ""}
                              </button>
                            </div>

                            {/* Row 3: Offer Letter or AI Analysis */}
                            <div className="card-btn-row">
                              {app.status === "OFFER" ? (
                                <button
                                  type="button"
                                  className="btn-card-action btn-offer-active"
                                  onClick={() => handleDownloadOffer(app.id, app.user?.name)}
                                  title="Download candidate official offer letter"
                                  disabled={actionLoading === `offer-dl-${app.id}`}
                                >
                                  <span>📜</span> {actionLoading === `offer-dl-${app.id}` ? "..." : "Offer Letter"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-card-action btn-make-offer"
                                  onClick={() => handleOpenOfferModal(app)}
                                  title="Generate & dispatch formal employment offer"
                                >
                                  <span>🎉</span> Make Offer
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn-card-action btn-inspect-profile"
                                onClick={() => setInspectCandidate(app)}
                                title="Inspect candidate full qualifications & notes"
                              >
                                <span>🔍</span> Profile
                              </button>
                            </div>

                            {/* Row 4: Full-width Stage Advance Dropdown */}
                            <div className="stage-advance-wrapper">
                              <span className="stage-advance-label">Stage:</span>
                              <select
                                className="stage-advance-select"
                                value={app.status || "APPLIED"}
                                onChange={(e) => handleStageMove(app.id, e.target.value)}
                                disabled={actionLoading === `stage-${app.id}`}
                              >
                                {KANBAN_STAGES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.icon} {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem 1rem",
                          color: "#94a3b8",
                          fontSize: "0.82rem",
                        }}
                      >
                        No candidates in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: PIPELINE ANALYTICS
          ========================================================= */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* 4 Metric Cards */}
          <div className="recruiter-metrics-grid">
            <div className="recruiter-metric-card jobs">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                Active Vacancies
              </span>
              <div className="recruiter-metric-value">{stats?.activeJobs || jobs.length}</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                {stats?.totalJobs || jobs.length} Total positions published
              </p>
            </div>

            <div className="recruiter-metric-card apps">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                Total Applicants
              </span>
              <div className="recruiter-metric-value">{stats?.totalApplications || applications.length}</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Submissions across active requisitions
              </p>
            </div>

            <div className="recruiter-metric-card interviews">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                Interviews Scheduled
              </span>
              <div className="recruiter-metric-value">{stats?.interviewsCount || 0}</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Live Google Meet &amp; Zoom invitations
              </p>
            </div>

            <div className="recruiter-metric-card offers">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                Offers Extended
              </span>
              <div className="recruiter-metric-value">{stats?.offersCount || 0}</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Successful hiring selections
              </p>
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div
            className="admin-section-card"
            style={{
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h3 style={{ color: "#ffffff", margin: "0 0 0.35rem 0", fontSize: "1.15rem" }}>
                Need to hire quickly?
              </h3>
              <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.88rem" }}>
                Publish vacancies with salary benchmarks and required skills tags to automatically match with JobHub candidates.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary-admin"
              onClick={() => setActiveTab("new-job")}
            >
              Post Opportunity Now
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: MY JOB OPENINGS
          ========================================================= */}
      {activeTab === "jobs" && (
        <div className="admin-section-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">My Posted Opportunities</h3>
              <p className="admin-header-subtitle">
                Manage positions published by your organization
              </p>
            </div>
            <button
              type="button"
              className="btn-primary-admin"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              onClick={() => setActiveTab("new-job")}
            >
              + Create New Opening
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="admin-data-table recruiter-job-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Position Title</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Salary Range</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ color: "#94a3b8", fontWeight: 700 }}>#{job.id}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{job.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{job.company}</div>
                      </td>
                      <td>{job.location}</td>
                      <td>
                        <span className="platform-chip" style={{ fontSize: "0.75rem" }}>
                          {job.jobType || "Full-Time"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#059669", fontSize: "0.85rem" }}>
                        {job.salaryRange || "Competitive"}
                      </td>
                      <td>
                        <span
                          className={`badge-status ${
                            job.status === "ACTIVE" ? "interview" : "saved"
                          }`}
                        >
                          {job.status === "ACTIVE" ? "● Active" : "○ Closed"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-action-role"
                          onClick={() => handleToggleJobStatus(job.id, job.status)}
                          disabled={actionLoading === `job-st-${job.id}`}
                        >
                          {job.status === "ACTIVE" ? "Close Job" : "Reopen"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                      You have not published any job openings yet. Click &quot;Post a Vacancy&quot; to publish your first role!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: POST A NEW VACANCY FORM
          ========================================================= */}
      {activeTab === "new-job" && (
        <div className="admin-form-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h3 className="admin-card-title" style={{ marginBottom: "0.4rem" }}>
            Publish a New Tech Vacancy
          </h3>
          <p className="admin-header-subtitle" style={{ marginBottom: "1.5rem" }}>
            The position will be indexed across JobHub and matched to candidates with relevant skills.
          </p>

          <form onSubmit={handleCreateJob} className="admin-form">
            <div className="form-grid-2">
              <div>
                <label>Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer (Java / Spring)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Hiring Organization *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Technologies"
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label>Location / Workplace *</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, India or 100% Remote"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Employment Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontWeight: 600,
                  }}
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Remote">100% Remote</option>
                  <option value="Contract">Contract / Freelance</option>
                  <option value="Internship">Internship</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label>Salary Range</label>
                <input
                  type="text"
                  placeholder="e.g. ₹15 LPA - ₹22 LPA or $120k - $150k"
                  value={jobSalary}
                  onChange={(e) => setJobSalary(e.target.value)}
                />
              </div>
              <div>
                <label>Experience Required</label>
                <input
                  type="text"
                  placeholder="e.g. 2-5 Years"
                  value={jobExp}
                  onChange={(e) => setJobExp(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label>Required Skills &amp; Tech Stack (Comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Java, Spring Boot, React, PostgreSQL, Docker"
                value={jobSkills}
                onChange={(e) => setJobSkills(e.target.value)}
              />
            </div>

            <div>
              <label>Role Description &amp; Requirements *</label>
              <textarea
                rows={5}
                placeholder="Detail role responsibilities, team structure, qualifications, and company perks..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary-admin"
              disabled={actionLoading === "create-job"}
              style={{ marginTop: "0.5rem" }}
            >
              {actionLoading === "create-job" ? "Publishing Opportunity..." : "Publish Job to Platform"}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          TAB 5: COMPANY BRANDING & RECRUITER PROFILE
          ========================================================= */}
      {activeTab === "profile" && (
        <div className="admin-form-card" style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h3 className="admin-card-title" style={{ marginBottom: "0.4rem" }}>
            Company Branding &amp; Recruiter Profile
          </h3>
          <p className="admin-header-subtitle" style={{ marginBottom: "1.5rem" }}>
            Candidates see this company information on job postings and interview invitations.
          </p>

          <form onSubmit={handleSaveProfile} className="admin-form">
            <div className="form-grid-2">
              <div>
                <label>Recruiter Name</label>
                <input
                  type="text"
                  value={profile.name || ""}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div>
                <label>Direct Phone Number</label>
                <input
                  type="text"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label>Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Google, Microsoft, Startup Inc"
                  value={profile.companyName || ""}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                />
              </div>
              <div>
                <label>Company Website</label>
                <input
                  type="url"
                  placeholder="https://company.com"
                  value={profile.companyWebsite || ""}
                  onChange={(e) => setProfile({ ...profile, companyWebsite: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label>Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Fintech, SaaS, Healthcare"
                  value={profile.companyIndustry || ""}
                  onChange={(e) => setProfile({ ...profile, companyIndustry: e.target.value })}
                />
              </div>
              <div>
                <label>Company Headquarters</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, India or San Francisco, CA"
                  value={profile.companyLocation || ""}
                  onChange={(e) => setProfile({ ...profile, companyLocation: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-admin"
              disabled={actionLoading === "profile"}
              style={{ marginTop: "0.5rem" }}
            >
              {actionLoading === "profile" ? "Saving Profile..." : "Save Company Branding"}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          TAB 6: CANDIDATE FOLLOW-UPS & NOTIFICATIONS INBOX
          ========================================================= */}
      {activeTab === "follow-ups" && (
        <div className="follow-ups-tab-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* In-Tab Notification Banner */}
          {followUpStats.unread > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1.5px solid #bfdbfe",
                borderRadius: "12px",
                padding: "0.85rem 1.35rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.3rem" }}>🔔</span>
                <span style={{ color: "#1e40af", fontSize: "0.92rem", fontWeight: 700 }}>
                  You have {followUpStats.unread} unread candidate follow-up {followUpStats.unread > 1 ? "inquiries" : "inquiry"} requiring attention.
                </span>
              </div>
              <button
                type="button"
                className="btn-action-role"
                onClick={handleMarkAllFollowUpsRead}
                style={{ padding: "0.4rem 0.95rem", fontSize: "0.82rem", background: "#ffffff", fontWeight: 700, borderRadius: "8px" }}
              >
                ✓ Mark All as Read
              </button>
            </div>
          )}

          {/* 4 Professional Metric Cards */}
          <div className="recruiter-metrics-grid">
            <div className="recruiter-metric-card jobs">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Follow-ups
              </span>
              <div className="recruiter-metric-value">{followUpStats.total}</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Active candidate conversation threads
              </p>
            </div>

            <div className="recruiter-metric-card offers">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Awaiting Recruiter Reply
              </span>
              <div className="recruiter-metric-value" style={{ color: "#d97706" }}>
                {followUpStats.waitingReply}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Candidates waiting for your response
              </p>
            </div>

            <div className="recruiter-metric-card interviews">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Shortlisted / Interviewing
              </span>
              <div className="recruiter-metric-value" style={{ color: "#10b981" }}>
                {followUps.filter((f) => f.status === "SHORTLISTED" || f.status === "INTERVIEW" || f.status === "OFFER").length}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Active pipeline opportunities
              </p>
            </div>

            <div className="recruiter-metric-card apps">
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Exchanged Messages
              </span>
              <div className="recruiter-metric-value" style={{ color: "#6366f1" }}>
                {followUps.reduce((acc, f) => acc + (f.messagesCount || 0), 0)}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                Direct candidate communication log
              </p>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div style={{
            background: "#ffffff",
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { key: "ALL", label: `All Threads (${followUps.length})` },
                { key: "WAITING", label: `⚡ Awaiting Reply (${followUps.filter((f) => f.isWaitingReply).length})` },
                { key: "UNREAD", label: `🔔 Unread (${followUps.filter((f) => f.isUnread).length})` },
                { key: "APPLIED", label: `📥 Applied (${followUps.filter((f) => f.status === "APPLIED").length})` },
                { key: "SHORTLISTED", label: `⭐ Shortlisted (${followUps.filter((f) => f.status === "SHORTLISTED").length})` },
                { key: "INTERVIEW", label: `📅 Interview (${followUps.filter((f) => f.status === "INTERVIEW").length})` },
                { key: "OFFER", label: `🎉 Offer Extended (${followUps.filter((f) => f.status === "OFFER").length})` },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFollowUpFilter(f.key)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "1px solid",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderColor: followUpFilter === f.key ? "#2563eb" : "#e2e8f0",
                    background: followUpFilter === f.key ? "#eff6ff" : "#ffffff",
                    color: followUpFilter === f.key ? "#1d4ed8" : "#64748b",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search & Actions */}
            <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flex: "1 1 300px", justifyContent: "flex-end" }}>
              <input
                type="text"
                placeholder="Search candidate, role, message..."
                value={followUpSearch}
                onChange={(e) => setFollowUpSearch(e.target.value)}
                style={{
                  padding: "0.45rem 0.85rem",
                  fontSize: "0.84rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  minWidth: "220px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                className="btn-action-role"
                onClick={handleMarkAllFollowUpsRead}
                style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                title="Mark all notifications as read"
              >
                ✓ Mark All Read
              </button>
              <button
                type="button"
                className="btn-action-role"
                onClick={loadData}
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.82rem" }}
                title="Refresh Follow-ups"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Follow-up Cards List */}
          {filteredFollowUps.length === 0 ? (
            <div style={{
              background: "#f8fafc",
              border: "1.5px dashed #cbd5e1",
              borderRadius: "14px",
              padding: "3.5rem 1.5rem",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "2.8rem", display: "block", marginBottom: "0.75rem" }}>💬</span>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.4rem" }}>
                No Follow-ups Found
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto 1.25rem" }}>
                {followUpSearch
                  ? `No follow-ups matching "${followUpSearch}". Try clearing your search query.`
                  : followUpFilter !== "ALL"
                  ? `No follow-ups currently in the '${followUpFilter}' stage.`
                  : "When candidates submit tailored follow-up inquiries regarding their applications or message you directly, their full conversation threads and status tracking will appear here."}
              </p>
              {followUpSearch && (
                <button
                  type="button"
                  className="btn-action-role"
                  onClick={() => setFollowUpSearch("")}
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {filteredFollowUps.map((f) => {
                const isUserLatest = f.isWaitingReply;
                const dateDisplay = f.latestSentAt
                  ? new Date(f.latestSentAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recently";

                return (
                  <div
                    key={f.applicationId}
                    style={{
                      background: "#ffffff",
                      border: f.isUnread ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "1.25rem",
                      boxShadow: f.isUnread
                        ? "0 4px 14px rgba(59, 130, 246, 0.12)"
                        : "0 2px 6px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Top Row: Candidate details, Job Tag, Status & Indicators */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "1.1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
                          }}
                        >
                          {(f.candidate?.name || "C").charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>
                              {f.candidate?.name || "Candidate"}
                            </strong>
                            {f.isUnread && (
                              <span
                                style={{
                                  background: "#ef4444",
                                  color: "#ffffff",
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  padding: "0.12rem 0.45rem",
                                  borderRadius: "6px",
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.15rem" }}>
                            <span>✉️ {f.candidate?.email || "No email"}</span>
                            {f.candidate?.phone && <span style={{ marginLeft: "0.65rem" }}>📞 {f.candidate.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right Tags: Role, Company, Status Pill, Waiting Indicator */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#334155",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            padding: "0.25rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          💼 {f.jobTitle} &bull; {f.company}
                        </span>

                        <span
                          style={{
                            background:
                              f.status === "OFFER"
                                ? "#f0fdf4"
                                : f.status === "INTERVIEW"
                                ? "#f5f3ff"
                                : f.status === "SHORTLISTED"
                                ? "#f0f9ff"
                                : "#fffbeb",
                            color:
                              f.status === "OFFER"
                                ? "#15803d"
                                : f.status === "INTERVIEW"
                                ? "#6d28d9"
                                : f.status === "SHORTLISTED"
                                ? "#0369a1"
                                : "#b45309",
                            border: "1px solid",
                            borderColor:
                              f.status === "OFFER"
                                ? "#bbf7d0"
                                : f.status === "INTERVIEW"
                                ? "#ddd6fe"
                                : f.status === "SHORTLISTED"
                                ? "#bae6fd"
                                : "#fde68a",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            padding: "0.25rem 0.65rem",
                            borderRadius: "6px",
                          }}
                        >
                          {f.status}
                        </span>

                        {isUserLatest ? (
                          <span
                            style={{
                              background: "#fff7ed",
                              color: "#c2410c",
                              border: "1px solid #ffedd5",
                              fontSize: "0.76rem",
                              fontWeight: 800,
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            ⚡ Waiting for Recruiter Reply
                          </span>
                        ) : (
                          <span
                            style={{
                              background: "#f8fafc",
                              color: "#64748b",
                              border: "1px solid #e2e8f0",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                            }}
                          >
                            ✓ Replied
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Latest Message Box */}
                    <div
                      style={{
                        background: "#f8fafc",
                        borderLeft: isUserLatest ? "3.5px solid #2563eb" : "3.5px solid #10b981",
                        borderRadius: "0 8px 8px 0",
                        padding: "0.85rem 1rem",
                        fontSize: "0.86rem",
                        color: "#334155",
                        lineHeight: 1.55,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.78rem", color: "#64748b" }}>
                        <span style={{ fontWeight: 700 }}>
                          {isUserLatest ? `👤 Candidate Follow-up (${f.candidate?.name || "Candidate"})` : `👔 Recruiter Reply (${f.latestSenderName || "Hiring Team"})`}
                        </span>
                        <span>{dateDisplay}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {f.latestMessage || "No message content available."}
                      </p>
                    </div>

                    {/* Schedule / Offer Meta info if available */}
                    {f.interviewTime && (
                      <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", padding: "0.5rem 0.85rem", fontSize: "0.82rem", color: "#6d28d9" }}>
                        📅 <strong>Interview Scheduled:</strong> {f.interviewTime} ({f.interviewRound || "General Round"})
                        {f.interviewMeetingLink && (
                          <a href={f.interviewMeetingLink} target="_blank" rel="noreferrer" style={{ marginLeft: "0.75rem", color: "#7c3aed", fontWeight: 700 }}>
                            Join Meeting Link ↗
                          </a>
                        )}
                      </div>
                    )}

                    {/* Bottom Actions Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", paddingTop: "0.4rem", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                          Thread History: <strong>{f.messagesCount || 0} messages</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn-primary-admin"
                          onClick={() => handleOpenChatFromFollowUp(f)}
                          style={{ padding: "0.4rem 0.95rem", fontSize: "0.82rem", borderRadius: "8px" }}
                        >
                          💬 Open Chat &amp; Reply
                        </button>

                        <button
                          type="button"
                          className="btn-action-role"
                          onClick={() => {
                            const targetApp = applications.find((a) => a.id === f.applicationId) || {
                              id: f.applicationId,
                              user: f.candidate,
                              job: { id: f.jobId, title: f.jobTitle, company: f.company },
                              status: f.status,
                            };
                            handleOpenScheduler(targetApp);
                          }}
                          style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem", borderRadius: "8px" }}
                        >
                          📅 Schedule
                        </button>

                        <button
                          type="button"
                          className="btn-action-role"
                          onClick={() => handleViewResume(f.applicationId)}
                          style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem", borderRadius: "8px" }}
                        >
                          📄 Resume
                        </button>

                        <button
                          type="button"
                          className="btn-action-role"
                          onClick={() => {
                            const targetApp = applications.find((a) => a.id === f.applicationId) || {
                              id: f.applicationId,
                              user: f.candidate,
                              job: { id: f.jobId, title: f.jobTitle, company: f.company },
                              status: f.status,
                            };
                            handleOpenAiAnalysis(targetApp);
                          }}
                          style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem", borderRadius: "8px" }}
                        >
                          ⚡ Match AI
                        </button>

                        {/* Quick Advance Status Dropdown */}
                        <select
                          value={f.status}
                          onChange={(e) => handleStageMove(f.applicationId, e.target.value)}
                          style={{
                            padding: "0.38rem 0.7rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          {KANBAN_STAGES.map((st) => (
                            <option key={st.id} value={st.id}>
                              Stage: {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          INTERVIEW SCHEDULER MODAL (WITH EMAIL DISPATCH)
          ========================================================= */}
      {interviewApp && (
        <div className="candidate-modal-backdrop" onClick={() => setInterviewApp(null)}>
          <div className="interview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase" }}>
                  Schedule Candidate Interview
                </span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0.25rem 0 0", color: "#0f172a" }}>
                  {interviewApp.user?.name || "Candidate"}
                </h2>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Role: <strong>{interviewApp.job?.title || "Target Position"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInterviewApp(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="admin-form">
              <div className="form-grid-2">
                <div>
                  <label>Interview Date *</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Interview Time *</label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label>Interview Stage / Round *</label>
                <select
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1.5px solid #cbd5e1" }}
                >
                  <option value="Initial Screening">1. Initial Screening &amp; Introduction</option>
                  <option value="Technical Assessment">2. Technical Live Coding / Assessment</option>
                  <option value="System Design">3. System Architecture &amp; Design</option>
                  <option value="Culture Fit & HR">4. Culture Fit &amp; HR Final Round</option>
                </select>
              </div>

              <div>
                <label>Video Meeting URL (Google Meet / Zoom) *</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Recruiter Instructions for Candidate</label>
                <textarea
                  rows={3}
                  placeholder="Add preparation instructions, calendar notes..."
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-action-delete"
                  onClick={() => setInterviewApp(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-admin"
                  style={{ background: "#10b981", borderColor: "#059669" }}
                  disabled={actionLoading === "scheduling"}
                >
                  {actionLoading === "scheduling" ? "Sending Calendar Invite..." : "📧 Send Interview Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          CANDIDATE INSPECTION DRAWER
          ========================================================= */}
      {inspectCandidate && (
        <div className="candidate-modal-backdrop" onClick={() => setInspectCandidate(null)}>
          <div className="candidate-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                  Candidate Profile #{inspectCandidate.id}
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0.25rem 0 0", color: "#0f172a" }}>
                  {inspectCandidate.user?.name || "Candidate Name"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectCandidate(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>EMAIL</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{inspectCandidate.user?.email || "—"}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>PHONE</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{inspectCandidate.user?.phone || "Not provided"}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>TARGET POSITION</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 700, color: "#2563eb" }}>{inspectCandidate.job?.title}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>APPLICATION STAGE</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 700 }}>{inspectCandidate.status || "APPLIED"}</p>
              </div>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>VERIFIED SKILLS</span>
              <div className="skills-tags-wrap">
                {inspectCandidate.user?.skills ? (
                  (typeof inspectCandidate.user.skills === "string"
                    ? inspectCandidate.user.skills.split(",")
                    : inspectCandidate.user.skills
                  ).map((s, idx) => (
                    <span key={idx} className="tag-pill">
                      {s.trim()}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>General software engineering</span>
                )}
              </div>
            </div>

            {/* Recruiter Notes */}
            {inspectCandidate.notes && (
              <div style={{ marginBottom: "1.25rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>RECRUITER NOTES</span>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.88rem", color: "#334155" }}>{inspectCandidate.notes}</p>
              </div>
            )}

            {/* Resume Quick Access Banner */}
            <div className="resume-preview-banner">
              <div className="resume-preview-info">
                <span className="resume-preview-icon">📄</span>
                <div>
                  <div className="resume-file-title">
                    {inspectCandidate.user?.name ? `${inspectCandidate.user.name.replace(/\s+/g, '_')}_Resume.doc` : "Candidate_Resume.doc"}
                  </div>
                  <div className="resume-file-sub">
                    {inspectCandidate.user?.experience || 0} years experience • {inspectCandidate.user?.skills ? "Skills available" : "Verified profile"}
                  </div>
                </div>
              </div>
              <div className="resume-preview-actions">
                <button
                  type="button"
                  className="btn-resume-view"
                  onClick={() => handleViewResume(inspectCandidate.id)}
                >
                  👁️ View Resume
                </button>
                <button
                  type="button"
                  className="btn-resume-download"
                  onClick={() => handleDownloadResume(inspectCandidate.id, inspectCandidate.user?.name)}
                  disabled={actionLoading === `resume-dl-${inspectCandidate.id}`}
                >
                  {actionLoading === `resume-dl-${inspectCandidate.id}` ? "Downloading..." : "📥 Download"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                type="button"
                className="btn-action-role"
                onClick={() => handleViewResume(inspectCandidate.id)}
              >
                📄 Full Resume
              </button>
              <button
                type="button"
                className="btn-primary-admin"
                onClick={() => {
                  const app = inspectCandidate;
                  setInspectCandidate(null);
                  handleOpenScheduler(app);
                }}
              >
                📅 Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          RESUME VIEWER & DOWNLOAD MODAL
          ========================================================= */}
      {resumeModal.isOpen && (
        <div
          className="candidate-modal-backdrop"
          onClick={() => setResumeModal({ isOpen: false, loading: false, data: null, error: null })}
        >
          <div
            className="resume-viewer-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="resume-modal-topbar">
              <div className="resume-modal-topbar-left">
                <span className="resume-badge-status">
                  APPLICATION #{resumeModal.data?.applicationId || "—"} • {resumeModal.data?.status || "APPLIED"}
                </span>
                <h2 className="resume-modal-title">
                  {resumeModal.loading ? "Loading Candidate Resume..." : (resumeModal.data?.candidateName || "Candidate Resume")}
                </h2>
              </div>

              <div className="resume-modal-actions">
                {resumeModal.data && (
                  <>
                    <button
                      type="button"
                      className="btn-resume-modal-action print-btn"
                      onClick={() => window.print()}
                      title="Print or Save as PDF"
                    >
                      🖨️ Print / PDF
                    </button>
                    <button
                      type="button"
                      className="btn-resume-modal-action download-btn"
                      onClick={() => handleDownloadResume(resumeModal.data.applicationId, resumeModal.data.candidateName)}
                      title="Download as Word Document"
                    >
                      📥 Download .doc
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="resume-modal-close-btn"
                  onClick={() => setResumeModal({ isOpen: false, loading: false, data: null, error: null })}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Paper Container */}
            <div className="resume-paper-scroll">
              {resumeModal.loading ? (
                <div className="resume-loading-state">
                  <div className="spinner-indicator"></div>
                  <p>Fetching candidate curriculum vitae &amp; credentials...</p>
                </div>
              ) : resumeModal.error ? (
                <div className="resume-error-state">
                  <p>⚠️ {resumeModal.error}</p>
                </div>
              ) : resumeModal.data ? (
                <div className="resume-paper-document printable-resume">
                  {/* Document Header */}
                  <div className="resume-doc-header">
                    <div className="resume-doc-identity">
                      <h1 className="resume-doc-name">{resumeModal.data.candidateName}</h1>
                      <div className="resume-doc-headline">
                        {resumeModal.data.jobTitle || "Professional Candidate"}
                      </div>
                      {resumeModal.data.company && (
                        <div className="resume-doc-company">
                          Applied for: <strong>{resumeModal.data.jobTitle}</strong> at <strong>{resumeModal.data.company}</strong>
                        </div>
                      )}
                    </div>

                    <div className="resume-doc-contacts">
                      <div className="resume-contact-item">
                        <span className="resume-contact-icon">✉️</span>
                        <span>{resumeModal.data.candidateEmail || "Not provided"}</span>
                      </div>
                      {resumeModal.data.candidatePhone && (
                        <div className="resume-contact-item">
                          <span className="resume-contact-icon">📞</span>
                          <span>{resumeModal.data.candidatePhone}</span>
                        </div>
                      )}
                      <div className="resume-contact-item">
                        <span className="resume-contact-icon">💼</span>
                        <span>{resumeModal.data.experienceYears} Years Experience</span>
                      </div>
                      {resumeModal.data.location && (
                        <div className="resume-contact-item">
                          <span className="resume-contact-icon">📍</span>
                          <span>{resumeModal.data.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="resume-doc-divider" />

                  {/* Skills Section */}
                  <div className="resume-doc-section">
                    <h3 className="resume-section-heading">
                      <span className="resume-section-icon">⚡</span> Core Competencies &amp; Technical Skills
                    </h3>
                    <div className="resume-skills-grid">
                      {resumeModal.data.skills ? (
                        (typeof resumeModal.data.skills === "string"
                          ? resumeModal.data.skills.split(",")
                          : resumeModal.data.skills
                        ).map((s, idx) => (
                          <span key={idx} className="resume-skill-badge">
                            ✓ {s.trim()}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                          Full Stack Software Engineering, System Design, Problem Solving
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Professional Summary / Extracted Resume Text */}
                  <div className="resume-doc-section">
                    <h3 className="resume-section-heading">
                      <span className="resume-section-icon">📋</span> Professional Summary &amp; Experience Dossier
                    </h3>
                    {resumeModal.data.rawResumeText && resumeModal.data.rawResumeText.trim() ? (
                      <div className="resume-raw-content">
                        {resumeModal.data.rawResumeText}
                      </div>
                    ) : (
                      <div className="resume-structured-summary">
                        <p>
                          Proactive and results-driven <strong>{resumeModal.data.jobTitle}</strong> with{" "}
                          <strong>{resumeModal.data.experienceYears} years</strong> of verified technical experience.
                          Equipped with expertise across{" "}
                          <strong>{resumeModal.data.skills || "modern software engineering practices"}</strong>.
                        </p>
                        <ul className="resume-summary-bullets">
                          <li>Proven proficiency in designing, maintaining, and deploying scalable software architectures.</li>
                          <li>Strong track record collaborating across cross-functional product and engineering teams.</li>
                          <li>Demonstrated commitment to code quality, testing standards, and agile delivery paradigms.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Application & Interview Status Summary */}
                  <div className="resume-doc-section">
                    <h3 className="resume-section-heading">
                      <span className="resume-section-icon">📌</span> Pipeline Application Details
                    </h3>
                    <div className="resume-pipeline-box">
                      <div className="pipeline-field">
                        <span className="pipeline-label">Current ATS Stage</span>
                        <span className="pipeline-val status-tag">{resumeModal.data.status}</span>
                      </div>
                      {resumeModal.data.interviewTime && (
                        <div className="pipeline-field">
                          <span className="pipeline-label">Upcoming Interview</span>
                          <span className="pipeline-val interview-val">
                            📅 {resumeModal.data.interviewTime} ({resumeModal.data.interviewRound || "Round 1"})
                          </span>
                        </div>
                      )}
                      {resumeModal.data.notes && (
                        <div className="pipeline-field" style={{ gridColumn: "1 / -1" }}>
                          <span className="pipeline-label">Recruiter Review Notes</span>
                          <span className="pipeline-val">{resumeModal.data.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Footer */}
                  <div className="resume-doc-footer">
                    <span>Verified JobHub Recruitment Network Profile • Confidential Recruiter Review</span>
                    <span>Document File: {resumeModal.data.resumeFileName || "Candidate_Resume.doc"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* =========================================================
          AI ATS MATCH SCORE & INTERVIEW QUESTIONS MODAL
          ========================================================= */}
      {aiAnalysisModal.isOpen && (
        <div className="candidate-modal-backdrop" onClick={() => setAiAnalysisModal({ isOpen: false, loading: false, data: null, candidateName: "", jobTitle: "" })}>
          <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="resume-modal-topbar">
              <div>
                <span className="resume-badge-status">AI TALENT INTELLIGENCE</span>
                <h2 className="resume-modal-title">Candidate Evaluation: {aiAnalysisModal.candidateName}</h2>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Role: <strong>{aiAnalysisModal.jobTitle}</strong>
                </p>
              </div>
              <button
                type="button"
                className="resume-modal-close-btn"
                onClick={() => setAiAnalysisModal({ isOpen: false, loading: false, data: null, candidateName: "", jobTitle: "" })}
              >
                ✕
              </button>
            </div>

            <div className="ai-modal-body">
              {aiAnalysisModal.loading ? (
                <div className="resume-loading-state">
                  <div className="spinner-indicator"></div>
                  <p>Analyzing candidate profile against requisition benchmarks...</p>
                </div>
              ) : aiAnalysisModal.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Score Card */}
                  <div className="ai-score-overview-box">
                    <div className="ai-score-big">
                      <span>{aiAnalysisModal.data.overallMatchPercentage}%</span>
                      <small>Overall ATS Fit</small>
                    </div>
                    <div className="ai-score-breakdown">
                      <div>
                        <strong>Skill Match:</strong> {aiAnalysisModal.data.skillMatchPercentage}%
                      </div>
                      <div>
                        <strong>Confidence:</strong>{" "}
                        <span style={{ color: aiAnalysisModal.data.matchConfidenceColor || "#10b981", fontWeight: 800 }}>
                          {aiAnalysisModal.data.matchConfidence}
                        </span>
                      </div>
                      <div>
                        <strong>Interview Probability:</strong> {aiAnalysisModal.data.interviewProbability}%
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {aiAnalysisModal.data.matchSummary && (
                    <div className="ai-summary-note">
                      💡 {aiAnalysisModal.data.matchSummary}
                    </div>
                  )}

                  {/* Matched Skills */}
                  <div>
                    <h4 className="ai-subheading">✓ Matched Competencies</h4>
                    <div className="skills-tags-wrap">
                      {aiAnalysisModal.data.matchedSkills?.length > 0 ? (
                        aiAnalysisModal.data.matchedSkills.map((s, idx) => (
                          <span key={idx} className="tag-pill matched-pill">
                            ✓ {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Review raw resume for domain alignment</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  {aiAnalysisModal.data.missingCriticalSkills?.length > 0 && (
                    <div>
                      <h4 className="ai-subheading">⚠️ Missing / Recommended Skills</h4>
                      <div className="skills-tags-wrap">
                        {aiAnalysisModal.data.missingCriticalSkills.map((s, idx) => (
                          <span key={idx} className="tag-pill missing-pill">
                            ○ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tailored Interview Questions */}
                  {aiAnalysisModal.data.interviewPrepQuestions?.length > 0 && (
                    <div>
                      <h4 className="ai-subheading">🎯 Tailored Interview Questions to Ask</h4>
                      <div className="ai-questions-list">
                        {aiAnalysisModal.data.interviewPrepQuestions.slice(0, 4).map((q, idx) => (
                          <div key={idx} className="ai-question-card">
                            <div className="ai-q-num">Q{idx + 1}. {q.topic || "Core Technology"}</div>
                            <p className="ai-q-text">{q.question}</p>
                            {q.expectedConcepts && (
                              <div className="ai-q-tip">
                                <strong>Target Answer:</strong> {q.expectedConcepts}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>No evaluation data available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          OFFER LETTER GENERATOR & DISPATCH MODAL
          ========================================================= */}
      {offerModal.isOpen && (
        <div className="candidate-modal-backdrop" onClick={() => setOfferModal({ isOpen: false, app: null, salary: "", designation: "", joiningDate: "", benefits: "", instructions: "" })}>
          <div className="offer-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="resume-modal-topbar">
              <div>
                <span className="resume-badge-status">COMPENSATION &amp; APPOINTMENT</span>
                <h2 className="resume-modal-title">Generate Formal Employment Offer</h2>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Candidate: <strong>{offerModal.app?.user?.name || "Candidate"}</strong> ({offerModal.app?.user?.email})
                </p>
              </div>
              <button
                type="button"
                className="resume-modal-close-btn"
                onClick={() => setOfferModal({ isOpen: false, app: null, salary: "", designation: "", joiningDate: "", benefits: "", instructions: "" })}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendOfferSubmit} className="admin-form" style={{ padding: "1.5rem" }}>
              <div className="form-grid-2">
                <div>
                  <label>Official Position Designation *</label>
                  <input
                    type="text"
                    value={offerModal.designation}
                    onChange={(e) => setOfferModal({ ...offerModal, designation: e.target.value })}
                    placeholder="e.g. Senior Full Stack Engineer"
                    required
                  />
                </div>
                <div>
                  <label>Annual Compensation Package (CTC) *</label>
                  <input
                    type="text"
                    value={offerModal.salary}
                    onChange={(e) => setOfferModal({ ...offerModal, salary: e.target.value })}
                    placeholder="e.g. ₹24,00,000 / $135,000"
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label>Expected Joining Date *</label>
                  <input
                    type="text"
                    value={offerModal.joiningDate}
                    onChange={(e) => setOfferModal({ ...offerModal, joiningDate: e.target.value })}
                    placeholder="e.g. October 15, 2026"
                    required
                  />
                </div>
                <div>
                  <label>Hiring Organization</label>
                  <input
                    type="text"
                    value={offerModal.app?.job?.company || profile.companyName || "JobHub Partner"}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label>Benefits &amp; Perks Package</label>
                <textarea
                  rows={2}
                  value={offerModal.benefits}
                  onChange={(e) => setOfferModal({ ...offerModal, benefits: e.target.value })}
                  placeholder="e.g. Comprehensive Medical Cover, Stock Options, Remote Setup Allowance..."
                />
              </div>

              <div>
                <label>Acceptance Instructions &amp; Notes</label>
                <textarea
                  rows={2}
                  value={offerModal.instructions}
                  onChange={(e) => setOfferModal({ ...offerModal, instructions: e.target.value })}
                  placeholder="Please review your offer and confirm acceptance..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  className="btn-action-delete"
                  onClick={() => setOfferModal({ isOpen: false, app: null, salary: "", designation: "", joiningDate: "", benefits: "", instructions: "" })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-action-role"
                  onClick={() => handleDownloadOffer(offerModal.app?.id, offerModal.app?.user?.name)}
                >
                  📥 Download Preview (.doc)
                </button>
                <button
                  type="submit"
                  className="btn-primary-admin"
                  style={{ background: "#f59e0b", borderColor: "#d97706", color: "#ffffff" }}
                  disabled={actionLoading === "send-offer"}
                >
                  {actionLoading === "send-offer" ? "Dispatching..." : "🎉 Issue & Email Formal Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          RECRUITER ↔ CANDIDATE IN-APP CHAT MODAL
          ========================================================= */}
      {chatModal.isOpen && (
        <div className="candidate-modal-backdrop" onClick={() => setChatModal({ isOpen: false, app: null, messages: [], loading: false, input: "" })}>
          <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="chat-avatar-circle">
                  {(chatModal.app?.user?.name || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                    {chatModal.app?.user?.name || "Candidate"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                    Role: {chatModal.app?.job?.title} &bull; {chatModal.app?.user?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="resume-modal-close-btn"
                onClick={() => setChatModal({ isOpen: false, app: null, messages: [], loading: false, input: "" })}
              >
                ✕
              </button>
            </div>

            {/* Message Stream */}
            <div className="chat-messages-container">
              {chatModal.loading ? (
                <div className="resume-loading-state">
                  <p>Loading messages...</p>
                </div>
              ) : chatModal.messages.length > 0 ? (
                chatModal.messages.map((m) => {
                  const isRecruiter = m.senderRole === "RECRUITER" || m.senderRole === "ADMIN";
                  return (
                    <div key={m.id} className={`chat-bubble-row ${isRecruiter ? "outbound" : "inbound"}`}>
                      <div className={`chat-bubble ${isRecruiter ? "outbound" : "inbound"}`}>
                        <div className="chat-bubble-sender">
                          {m.senderName} ({m.senderRole})
                        </div>
                        <div className="chat-bubble-text">{m.message}</div>
                        <div className="chat-bubble-time">
                          {m.sentAt ? new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="chat-empty-state">
                  <span>💬</span>
                  <p>No messages yet. Send a message to start communicating directly with {chatModal.app?.user?.name || "this candidate"}!</p>
                </div>
              )}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder={`Type a message to ${chatModal.app?.user?.name || "candidate"}...`}
                value={chatModal.input}
                onChange={(e) => setChatModal({ ...chatModal, input: e.target.value })}
                required
              />
              <button type="submit" className="btn-primary-admin" style={{ padding: "0.6rem 1.2rem" }}>
                Send ➔
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default RecruiterPortal;
