import React, { useState, useMemo } from "react";
import Pagination from "../Pagination";
import { applicationService, careerService } from "../../services/apiService";
import { generateCandidateFollowUpMessage } from "../../services/jobMatchingService";
import "../../styles/tabs.css";
import "../../styles/recruiter.css";

const ApplicationsTab = ({ applications = [], onUpdateStatus, onRefresh }) => {
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Candidate Chat & Offer State
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

  const statusConfig = {
    APPLIED: { label: "Applied", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    SHORTLISTED: { label: "Shortlisted", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
    INTERVIEW: { label: "Interview", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
    OFFER: { label: "Offer", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    HIRED: { label: "Hired", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
    IN_REVIEW: { label: "In Review", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
    SAVED: { label: "Saved", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    REJECTED: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  };

  const statusCounts = useMemo(() => {
    const counts = { APPLIED: 0, SHORTLISTED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, IN_REVIEW: 0, SAVED: 0, REJECTED: 0 };
    applications.forEach((app) => {
      const s = (app.status || "SAVED").toUpperCase();
      if (counts[s] !== undefined) {
        counts[s]++;
      } else {
        counts[s] = 1;
      }
    });
    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (selectedFilter === "ALL") return applications;
    return applications.filter((app) => (app.status || "SAVED") === selectedFilter);
  }, [applications, selectedFilter]);

  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage, itemsPerPage]);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteInput, setNoteInput] = useState("");

  const handleStatusChange = (applicationId, newStatus) => {
    onUpdateStatus(applicationId, newStatus);
  };

  const handleSaveNote = async (applicationId) => {
    try {
      await applicationService.updateNotes(applicationId, noteInput);
      setEditingNoteId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  const StatusBadge = ({ status, applicationId }) => (
    <div className="status-selector">
      <select
        value={status}
        onChange={(e) => handleStatusChange(applicationId, e.target.value)}
        className="status-select"
        style={{
          color: statusConfig[status]?.color || "#2563eb",
          background: statusConfig[status]?.bg || "#eff6ff",
          borderColor: statusConfig[status]?.border || "#bfdbfe",
          fontWeight: 700,
          padding: "0.4rem 0.8rem",
          borderRadius: "8px",
        }}
      >
        {Object.entries(statusConfig).map(([key, config]) => (
          <option key={key} value={key}>
            {config.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="applications-tab" style={{ display: "grid", gap: "2rem", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div className="tab-header" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <h1 style={{ color: "#0f172a", fontSize: "2rem", fontWeight: 800 }}>Application Tracker & Pipeline</h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          Monitor your job applications, interviews, offers, and recruitment pipeline in real time.
        </p>
        {onRefresh && (
          <div style={{ marginTop: "0.6rem" }}>
            <button
              type="button"
              className="btn-outline"
              onClick={onRefresh}
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", fontWeight: 700, borderRadius: "8px", background: "#f8fafc", cursor: "pointer" }}
            >
              🔄 Refresh Tracker
            </button>
          </div>
        )}
      </div>

      {applications.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div
              className={`summary-card ${selectedFilter === "ALL" ? "active-summary" : ""}`}
              onClick={() => { setSelectedFilter("ALL"); setCurrentPage(1); }}
              style={{ cursor: "pointer", border: selectedFilter === "ALL" ? "2px solid #2563eb" : undefined }}
            >
              <div className="summary-info">
                <span className="summary-count" style={{ color: "#0f172a" }}>{applications.length}</span>
                <p className="summary-label">Total Applications</p>
              </div>
            </div>

            {Object.entries(statusConfig).map(([status, config]) => (
              <div
                key={status}
                className="summary-card"
                onClick={() => { setSelectedFilter(status); setCurrentPage(1); }}
                style={{
                  cursor: "pointer",
                  border: selectedFilter === status ? `2px solid ${config.color}` : undefined,
                  background: selectedFilter === status ? config.bg : "#ffffff"
                }}
              >
                <div className="summary-info">
                  <span className="summary-count" style={{ color: config.color }}>
                    {statusCounts[status] || 0}
                  </span>
                  <p className="summary-label">{config.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* List of Applications or Filter Empty State */}
          {filteredApplications.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "2.5rem 1.5rem", textAlign: "center", margin: "0.5rem 0" }}>
              <span style={{ fontSize: "2.2rem", display: "block", marginBottom: "0.5rem" }}>
                {selectedFilter === "SAVED" ? "🔖" : "📋"}
              </span>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.35rem" }}>
                No {statusConfig[selectedFilter]?.label || selectedFilter} Opportunities
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                {selectedFilter === "SAVED"
                  ? "You haven't bookmarked any jobs as 'Saved' yet. Click the 'Save' button on any job card in the All Jobs tab to bookmark opportunities here for later."
                  : `You currently have 0 applications in the '${statusConfig[selectedFilter]?.label || selectedFilter}' stage.`}
              </p>
            </div>
          ) : (
            <div className="applications-list" style={{ display: "grid", gap: "1rem" }}>
              {paginatedApplications.map((app) => {
                const title = app.jobTitle || app.job?.title || "Role";
                const company = app.company || app.job?.company || "Company";
                const location = app.location || app.job?.location || "Remote / Global";
                const source = app.source || app.job?.source || "Direct Portal";
                const status = app.status || "SAVED";
                const applyLink = app.applyLink || app.job?.applyLink;
                const dateVal = app.savedAt || app.appliedDate;

                return (
                  <div key={app.id} className="application-card" style={{ padding: "1.25rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                    <div className="app-header">
                      <div className="app-title-section">
                        <h3 className="app-job-title" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>{title}</h3>
                        <p className="app-company" style={{ color: "#64748b", margin: 0, fontWeight: 500 }}>{company}</p>
                      </div>
                      <StatusBadge status={status} applicationId={app.id} />
                    </div>

                    <div className="app-details" style={{ marginTop: "0.75rem", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "#475569" }}>
                      <p className="detail-item" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                        <span>{location}</span>
                      </p>
                      <p className="detail-item" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        <span>{source}</span>
                      </p>
                      {dateVal && (
                        <p className="detail-item" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                          <span>Applied: {Array.isArray(dateVal) ? `${dateVal[0]}-${String(dateVal[1]).padStart(2, "0")}-${String(dateVal[2]).padStart(2, "0")}` : new Date(dateVal).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>

                    {/* Note Display & Edit Section */}
                    {editingNoteId === app.id ? (
                      <div style={{ marginTop: "0.85rem", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.75rem" }}>
                        <textarea
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="Add personal note (e.g. Interview scheduled, HR contacted, follow-up date)..."
                          rows={2}
                          style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "0.5rem" }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => setEditingNoteId(null)}
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleSaveNote(app.id)}
                            style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem", fontWeight: 700 }}
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : app.notes ? (
                      <div style={{ marginTop: "0.85rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.65rem 0.95rem", fontSize: "0.85rem", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontSize: "0.9rem" }}>📝</span>
                            <strong style={{ color: "#0f172a", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Personal Note
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEditingNoteId(app.id); setNoteInput(app.notes); }}
                            style={{ background: "none", border: "none", color: "#2563eb", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, padding: 0 }}
                          >
                            Edit
                          </button>
                        </div>
                        <p style={{ margin: 0, color: "#334155", lineHeight: 1.45 }}>{app.notes}</p>
                      </div>
                    ) : (
                      <div style={{ marginTop: "0.6rem" }}>
                        <button
                          type="button"
                          onClick={() => { setEditingNoteId(app.id); setNoteInput(""); }}
                          style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.8rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: 0 }}
                        >
                          <span>+ Add Note</span>
                        </button>
                      </div>
                    )}

                    {/* Offer Celebration Banner */}
                    {status === "OFFER" && (
                      <div
                        style={{
                          margin: "0.85rem 0",
                          background: "linear-gradient(135deg, #fffbeb 0%, #ecfdf5 100%)",
                          border: "1.5px solid #fde68a",
                          borderRadius: "10px",
                          padding: "0.85rem 1rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "0.75rem",
                          boxShadow: "0 2px 8px rgba(245, 158, 11, 0.08)"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontSize: "1rem" }}>🎉</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Offer Extended
                            </span>
                          </div>
                          <h4 style={{ margin: "0.15rem 0 0.35rem", color: "#0f172a", fontSize: "0.95rem", fontWeight: 800 }}>
                            {app.offerDesignation || title}
                          </h4>
                          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", fontSize: "0.78rem", color: "#475569" }}>
                            {app.offerSalary && <span>💰 <strong>Package:</strong> {app.offerSalary}</span>}
                            {app.offerJoiningDate && <span>📅 <strong>Joining:</strong> {app.offerJoiningDate}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-download-offer-candidate"
                          style={{
                            padding: "0.48rem 0.95rem",
                            fontSize: "0.8rem",
                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
                          }}
                          onClick={() => handleDownloadOfferLetter(app.id, title)}
                          disabled={downloadingOfferId === app.id}
                        >
                          {downloadingOfferId === app.id ? "Downloading..." : "📜 Download Offer (.doc)"}
                        </button>
                      </div>
                    )}

                    {/* Card Actions (Chat with Recruiter + Open Job) */}
                    <div
                      className="app-actions"
                      style={{
                        marginTop: "1rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.6rem"
                      }}
                    >
                      <button
                        type="button"
                        className={`btn-chat-recruiter ${app.messageCount > 0 ? "has-messages" : ""}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.45rem 0.85rem",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onClick={() => handleOpenChat(app)}
                        title="Chat directly with the recruiter"
                      >
                        <span>💬</span> Chat with Recruiter
                        {app.messageCount > 0 && (
                          <span className="chat-badge-count">{app.messageCount}</span>
                        )}
                      </button>

                      {applyLink && (
                        <a
                          href={applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", textDecoration: "none" }}
                        >
                          <span>Open Application Portal</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredApplications.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredApplications.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </>
      ) : (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: "1rem" }}><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          <h3>No Applications Tracked Yet</h3>
          <p>When you apply for jobs or bookmark positions, they will automatically appear here for tracking.</p>
        </div>
      )}

      {/* Candidate ↔ Recruiter In-App Chat Modal Drawer */}
      {chatModal.isOpen && (
        <div
          className="candidate-modal-backdrop"
          onClick={() => setChatModal({ isOpen: false, app: null, messages: [], loading: false, input: "" })}
        >
          <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="chat-avatar-circle" style={{ background: "#2563eb" }}>
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                    Recruiter Conversation &bull; {chatModal.app?.company || chatModal.app?.job?.company || "Hiring Team"}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                      Role: <strong>{chatModal.app?.jobTitle || chatModal.app?.job?.title || "Role"}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "12px",
                        color: statusConfig[chatModal.app?.status || "APPLIED"]?.color || "#2563eb",
                        background: statusConfig[chatModal.app?.status || "APPLIED"]?.bg || "#eff6ff",
                        border: `1px solid ${statusConfig[chatModal.app?.status || "APPLIED"]?.border || "#bfdbfe"}`,
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

            {/* Message Stream */}
            <div className="chat-messages-container">
              {chatModal.loading ? (
                <div className="resume-loading-state">
                  <p>Loading messages...</p>
                </div>
              ) : chatModal.messages.length > 0 ? (
                chatModal.messages.map((m) => {
                  const isCandidate = m.senderRole === "USER" || m.senderRole === "CANDIDATE";
                  return (
                    <div key={m.id} className={`chat-bubble-row ${isCandidate ? "outbound" : "inbound"}`}>
                      <div className={`chat-bubble ${isCandidate ? "outbound" : "inbound"}`}>
                        <div className="chat-bubble-sender">
                          {m.senderName} ({m.senderRole})
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

            {/* Input Bar */}
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
    </div>
  );
};

export default ApplicationsTab;
