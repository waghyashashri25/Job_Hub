import React, { useState, useEffect } from "react";
import { applicationService, careerService } from "../services/apiService";
import { generateCandidateFollowUpMessage } from "../services/jobMatchingService";
import "../styles/applications.css";
import "../styles/recruiter.css";

const ApplicationTracker = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  // Candidate Chat State
  const [chatModal, setChatModal] = useState({
    isOpen: false,
    app: null,
    messages: [],
    loading: false,
    input: "",
  });
  const [downloadingOfferId, setDownloadingOfferId] = useState(null);
  const [isFramingMessage, setIsFramingMessage] = useState(false);
  const [framingNotification, setFramingNotification] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await applicationService.getApplications();
      setApplications(response.data || []);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch applications";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId, status) => {
    try {
      await applicationService.updateStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status } : app,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Failed to update application status");
    }
  };

  const handleDownloadOfferLetter = async (appId, jobTitle) => {
    setDownloadingOfferId(appId);
    try {
      const res = await applicationService.downloadOfferLetter(appId);
      const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (jobTitle || "Offer").replace(/[^a-zA-Z0-9_]/g, "_");
      link.setAttribute("download", `${safeName}_Offer_Letter.doc`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download offer letter.");
    } finally {
      setDownloadingOfferId(null);
    }
  };

  const handleOpenChat = async (app) => {
    setChatModal({ isOpen: true, app, messages: [], loading: true, input: "" });
    try {
      const res = await applicationService.getMessages(app.id);
      setChatModal({ isOpen: true, app, messages: res.data || [], loading: false, input: "" });
    } catch (err) {
      setChatModal({ isOpen: true, app, messages: [], loading: false, input: "" });
    }
  };

  const handleAutoFrameFollowUp = async (overrideStatus = null) => {
    if (!chatModal.app) return;
    setIsFramingMessage(true);
    setFramingNotification("");

    try {
      let userProfile = null;
      try {
        const pStr = localStorage.getItem("userProfile");
        if (pStr) userProfile = JSON.parse(pStr);
      } catch (e) {}

      let resumeData = null;
      try {
        const rStr = localStorage.getItem("jobhub_parsed_resume");
        if (rStr) resumeData = JSON.parse(rStr);
      } catch (e) {}

      const candidateName = userProfile?.name || resumeData?.name || localStorage.getItem("userName") || "Yashashri Wagh";
      const targetApp = chatModal.app;
      const targetStatus = overrideStatus || targetApp.status || "APPLIED";

      let rawDate = targetApp.savedAt || targetApp.appliedDate;
      let dateString = "";
      if (rawDate) {
        try {
          const d = Array.isArray(rawDate)
            ? new Date(rawDate[0], rawDate[1] - 1, rawDate[2])
            : new Date(rawDate);
          dateString = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        } catch (e) {}
      }

      let generatedMessage = "";
      try {
        const res = await careerService.generateFollowUpMessage({
          candidateName,
          jobTitle: targetApp.jobTitle || targetApp.job?.title || "Software Engineer",
          company: targetApp.company || targetApp.job?.company || "Hiring Team",
          status: targetStatus,
          appliedDate: dateString,
          interviewTime: targetApp.interviewTime,
          interviewRound: targetApp.interviewRound,
          interviewMeetingLink: targetApp.interviewMeetingLink,
          offerDesignation: targetApp.offerDesignation,
          offerSalary: targetApp.offerSalary,
          offerJoiningDate: targetApp.offerJoiningDate,
        });
        if (res?.data?.message) {
          generatedMessage = res.data.message;
        }
      } catch (e) {}

      if (!generatedMessage) {
        generatedMessage = generateCandidateFollowUpMessage({ ...targetApp, status: targetStatus }, userProfile, resumeData);
      }

      if (generatedMessage) {
        setChatModal((prev) => ({ ...prev, input: generatedMessage }));
        setFramingNotification(`✨ Follow-up message framed for ${targetStatus} stage!`);
        setTimeout(() => setFramingNotification(""), 4000);
      }
    } catch (err) {
      console.warn("Follow-up framing failed:", err);
    } finally {
      setIsFramingMessage(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatModal.app || !chatModal.input || !chatModal.input.trim()) return;

    const messageText = chatModal.input.trim();
    setChatModal((prev) => ({ ...prev, input: "", loading: false }));

    let userProfile = null;
    try {
      const pStr = localStorage.getItem("userProfile");
      if (pStr) userProfile = JSON.parse(pStr);
    } catch (err) {}

    let resumeData = null;
    try {
      const rStr = localStorage.getItem("jobhub_parsed_resume");
      if (rStr) resumeData = JSON.parse(rStr);
    } catch (err) {}

    const senderEmail = userProfile?.email || localStorage.getItem("userEmail") || resumeData?.email || chatModal.app?.user?.email || "waghyashashri09@gmail.com";
    const senderName = userProfile?.name || localStorage.getItem("userName") || resumeData?.name || "Yashashri Wagh";

    try {
      const res = await applicationService.sendMessage(chatModal.app.id, messageText, {
        email: senderEmail,
        name: senderName,
        role: "USER",
      });
      const newMsg = res.data?.message;
      if (newMsg) {
        setChatModal((prev) => ({ ...prev, messages: [...prev.messages, newMsg] }));
      }
    } catch (err) {
      console.error("Failed to send message", err);
      // Fallback message so candidate sees their sent message immediately in thread
      const fallbackMsg = {
        id: Date.now(),
        applicationId: chatModal.app.id,
        senderEmail,
        senderName,
        senderRole: "USER",
        message: messageText,
        sentAt: new Date().toISOString(),
      };
      setChatModal((prev) => ({ ...prev, messages: [...prev.messages, fallbackMsg] }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SAVED":
        return "status-saved";
      case "APPLIED":
        return "status-applied";
      case "SHORTLISTED":
        return "status-interview";
      case "IN_REVIEW":
        return "status-applied";
      case "INTERVIEW":
        return "status-interview";
      case "OFFER":
      case "HIRED":
        return "status-interview";
      case "REJECTED":
        return "status-rejected";
      default:
        return "status-saved";
    }
  };

  return (
    <section className="applications-page">
      <header className="applications-header">
        <p className="page-kicker">Pipeline overview</p>
        <h1>Application Tracker</h1>
      </header>

      {error && <div className="ui-alert error">{error}</div>}

      {loading && (
        <div className="loading-block">
          <span className="spinner" />
          <p>Loading applications...</p>
        </div>
      )}

      {applications.length === 0 && !loading && (
        <div className="empty-state">
          No applications yet. Save a job to get started!
        </div>
      )}

      <div className="applications-list">
        {applications.map((app) => (
          <article key={app.id} className="application-card glass">
            <div className="app-header">
              <div>
                <h3>{app.jobTitle || app.job?.title || "Untitled Job"}</h3>
                <p className="company">
                  {app.company || app.job?.company || "Unknown Company"}
                </p>
                <p className="location">
                  {app.location || app.job?.location || "Remote"}
                </p>
                <p className="source">
                  {app.source || app.job?.source || "Platform unavailable"}
                </p>
              </div>
              <div className={`status-badge ${getStatusColor(app.status)}`}>
                {app.status}
              </div>
            </div>

            {/* Offer Celebration Banner */}
            {app.status === "OFFER" && (
              <div className="candidate-offer-banner">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  <span style={{ fontSize: "1.8rem" }}>🎉</span>
                  <div>
                    <h4 style={{ margin: "0 0 0.25rem 0", color: "#166534", fontSize: "1.05rem" }}>
                      Congratulations! Official Offer Extended
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#15803d" }}>
                      <strong>{app.offerDesignation || app.jobTitle}</strong> &bull; Compensation: <strong>{app.offerSalary || "Competitive"}</strong> &bull; Expected Start: {app.offerJoiningDate || "TBD"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-download-offer-candidate"
                  onClick={() => handleDownloadOfferLetter(app.id, app.jobTitle)}
                  disabled={downloadingOfferId === app.id}
                >
                  {downloadingOfferId === app.id ? "Downloading..." : "📜 Download Offer Letter (.doc)"}
                </button>
              </div>
            )}

            <div className="app-footer">
              {editingId === app.id ? (
                <div className="status-editor">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="SAVED">SAVED</option>
                    <option value="APPLIED">APPLIED</option>
                    <option value="INTERVIEW">INTERVIEW</option>
                    <option value="OFFER">OFFER</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(app.id, newStatus)}
                  >
                    Update
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="app-actions">
                  <button
                    className={`btn-chat-recruiter ${app.messageCount > 0 ? "has-messages" : ""}`}
                    type="button"
                    onClick={() => handleOpenChat(app)}
                  >
                    💬 Chat with Recruiter
                    {app.messageCount > 0 && (
                      <span className="chat-badge-count">{app.messageCount}</span>
                    )}
                  </button>
                  <button
                    className="btn-edit-status"
                    type="button"
                    onClick={() => {
                      setEditingId(app.id);
                      setNewStatus(app.status);
                    }}
                  >
                    Update Status
                  </button>
                  <button
                    className="btn-open-job"
                    type="button"
                    onClick={() => {
                      const link = app.applyLink || app.job?.applyLink;
                      if (link) {
                        window.open(link, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    Open Job
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Candidate ↔ Recruiter Chat Drawer */}
      {chatModal.isOpen && (
        <div className="candidate-modal-backdrop" onClick={() => setChatModal({ isOpen: false, app: null, messages: [], loading: false, input: "" })}>
          <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="chat-avatar-circle" style={{ background: "#2563eb" }}>
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                    Recruiter Conversation &bull; {chatModal.app?.company || "Hiring Team"}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                      Position: <strong>{chatModal.app?.jobTitle || "Role"}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "12px",
                        color: "#2563eb",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      Stage: {chatModal.app?.status || "APPLIED"}
                    </span>
                  </div>
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

            {/* Application Timeline & Schedule Sub-Header */}
            <div
              style={{
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                padding: "0.55rem 1.25rem",
                fontSize: "0.78rem",
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>🕒</span>
                <span>
                  <strong>Applied:</strong>{" "}
                  {chatModal.app?.savedAt || chatModal.app?.appliedDate
                    ? (Array.isArray(chatModal.app.savedAt || chatModal.app.appliedDate)
                        ? `${(chatModal.app.savedAt || chatModal.app.appliedDate)[0]}-${String((chatModal.app.savedAt || chatModal.app.appliedDate)[1]).padStart(2, "0")}-${String((chatModal.app.savedAt || chatModal.app.appliedDate)[2]).padStart(2, "0")}`
                        : new Date(chatModal.app.savedAt || chatModal.app.appliedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }))
                    : "Recently"}
                </span>
              </div>

              {chatModal.app?.interviewTime && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "0.15rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
                  <span>📅</span>
                  <span>
                    <strong>Interview:</strong> {chatModal.app.interviewTime} {chatModal.app.interviewRound ? `(${chatModal.app.interviewRound})` : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="chat-messages-container">
              {chatModal.loading ? (
                <div className="resume-loading-state">
                  <p>Connecting to recruitment thread...</p>
                </div>
              ) : chatModal.messages.length > 0 ? (
                chatModal.messages.map((m) => {
                  const isCandidate = m.senderRole === "USER" || m.senderRole === "CANDIDATE";
                  return (
                    <div key={m.id} className={`chat-bubble-row ${isCandidate ? "outbound" : "inbound"}`}>
                      <div className={`chat-bubble ${isCandidate ? "outbound" : "inbound"}`}>
                        <div className="chat-bubble-sender">
                          {m.senderName} ({isCandidate ? "You" : "Recruiter"})
                        </div>
                        <div className="chat-bubble-text" style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
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
                  <p>No messages yet with the recruiter for this application.</p>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0" }}>
                    Click <strong>✨ Auto-Frame Follow-Up</strong> below to automatically craft a professional message based on your application date and stage!
                  </p>
                </div>
              )}
            </div>

            {/* Auto-Frame Follow-Up Toolbar */}
            <div
              style={{
                background: "#f0fdf4",
                borderTop: "1px solid #dcfce7",
                borderBottom: "1px solid #dcfce7",
                padding: "0.45rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.4rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>
                  💡 Quick Follow-Up:
                </span>
                <button
                  type="button"
                  onClick={() => handleAutoFrameFollowUp("APPLIED")}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #bbf7d0",
                    color: "#15803d",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Frame a friendly check-in inquiring if your application has been reviewed"
                >
                  Status Inquiry
                </button>
                {chatModal.app?.status === "SHORTLISTED" && (
                  <button
                    type="button"
                    onClick={() => handleAutoFrameFollowUp("SHORTLISTED")}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #bbf7d0",
                      color: "#15803d",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Next Steps
                  </button>
                )}
                {chatModal.app?.status === "INTERVIEW" && (
                  <button
                    type="button"
                    onClick={() => handleAutoFrameFollowUp("INTERVIEW")}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #bbf7d0",
                      color: "#15803d",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Interview Confirm & Prep
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAutoFrameFollowUp()}
                disabled={isFramingMessage}
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.32rem 0.75rem",
                  borderRadius: "7px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 1px 4px rgba(22, 163, 74, 0.2)",
                  transition: "all 0.2s ease",
                }}
                title="Auto-frame customized follow up message fetching status, elapsed application date and interview schedule"
              >
                <span>{isFramingMessage ? "⏳ Framing..." : "✨ Auto-Frame Follow-Up"}</span>
              </button>
            </div>

            {framingNotification && (
              <div
                style={{
                  background: "#dbeafe",
                  color: "#1e40af",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.3rem 1rem",
                  textAlign: "center",
                  borderBottom: "1px solid #bfdbfe",
                }}
              >
                {framingNotification}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="chat-input-bar" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <textarea
                placeholder="Type your message to the hiring team, or click ✨ Auto-Frame Follow-Up..."
                value={chatModal.input}
                onChange={(e) => setChatModal({ ...chatModal, input: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows={chatModal.input && chatModal.input.includes("\n") ? 4 : 2}
                style={{
                  flex: 1,
                  padding: "0.6rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  resize: "vertical",
                  minHeight: "42px",
                  maxHeight: "130px",
                  lineHeight: 1.4,
                }}
                required
              />
              <button
                type="button"
                onClick={handleSendMessage}
                className="btn-primary-admin"
                style={{
                  padding: "0.65rem 1.25rem",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                  cursor: "pointer",
                }}
              >
                <span>Send</span> ➔
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ApplicationTracker;
