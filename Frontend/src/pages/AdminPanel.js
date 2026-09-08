import React, { useState, useEffect, useMemo, useCallback } from "react";
import { adminService, jobService } from "../services/apiService";
import { getUserEmail } from "../utils/auth";
import "../styles/admin.css";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [connectors, setConnectors] = useState({});
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);

  // Candidate Inspector Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateNotes, setCandidateNotes] = useState("");

  // Filters for User Directory
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");

  // Job creation state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [applyLink, setApplyLink] = useState("");

  // Aggregator state
  const [keyword, setKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [exportLoading, setExportLoading] = useState("");
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentAdminEmail = getUserEmail();

  // Helper to trigger browser CSV file download
  const downloadBlob = (blobData, defaultFileName) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", defaultFileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes, appsRes, jobsRes, healthRes, schedRes, announceRes] =
        await Promise.allSettled([
          adminService.getStats(),
          adminService.getUsers(),
          adminService.getApplications(),
          adminService.getJobs(),
          adminService.getConnectorHealth(),
          adminService.getSchedulerStatus(),
          adminService.getAnnouncement(),
        ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data);
      if (appsRes.status === "fulfilled") setApplications(appsRes.value.data);
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.data);

      if (healthRes.status === "fulfilled") {
        setConnectors(healthRes.value.data.connectors || healthRes.value.data || {});
      }
      if (schedRes.status === "fulfilled") {
        setSchedulerStatus(schedRes.value.data);
      }
      if (announceRes.status === "fulfilled") {
        const ann = announceRes.value.data.announcement || "";
        setAnnouncement(ann);
        setAnnouncementDraft(ann);
        setAnnouncementActive(Boolean(ann && ann.trim().length > 0));
      }
    } catch (err) {
      setError("Failed to load some dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // CSV Exports
  const handleExportUsers = async () => {
    setExportLoading("users");
    setMessage("");
    setError("");
    try {
      const res = await adminService.exportUsersCsv();
      downloadBlob(res.data, `jobhub_candidates_${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage("✓ Candidate directory successfully exported as CSV.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to export candidates CSV");
    } finally {
      setExportLoading("");
    }
  };

  const handleExportApplications = async () => {
    setExportLoading("applications");
    setMessage("");
    setError("");
    try {
      const res = await adminService.exportApplicationsCsv();
      downloadBlob(res.data, `jobhub_applications_${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage("✓ Applications pipeline successfully exported as CSV.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to export applications CSV");
    } finally {
      setExportLoading("");
    }
  };

  // Role Promotion / Demotion
  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const confirmMsg = `Are you sure you want to change this user's role to ${newRole}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(`role-${userId}`);
    setMessage("");
    setError("");

    try {
      const res = await adminService.updateUserRole(userId, newRole);
      setMessage(res.data.message || `User role updated to ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      if (stats) {
        setStats((prev) => ({
          ...prev,
          adminCount: newRole === "ADMIN" ? prev.adminCount + 1 : prev.adminCount - 1,
          userCount: newRole === "USER" ? prev.userCount + 1 : prev.userCount - 1,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user role");
    } finally {
      setActionLoading("");
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user '${userName}'?`)) {
      return;
    }

    setActionLoading(`delete-${userId}`);
    setMessage("");
    setError("");

    try {
      const res = await adminService.deleteUser(userId);
      setMessage(res.data.message || "User deleted successfully");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (stats) {
        setStats((prev) => ({
          ...prev,
          totalUsers: Math.max(0, prev.totalUsers - 1),
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete user");
    } finally {
      setActionLoading("");
    }
  };

  // Application Pipeline Status Update
  const handleUpdateAppStatus = async (appId, newStatus, notes = null) => {
    setActionLoading(`app-status-${appId}`);
    setMessage("");
    setError("");
    try {
      const res = await adminService.updateApplicationStatus(appId, newStatus, notes);
      setMessage(res.data.message || `Application #${appId} status updated to ${newStatus}`);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId
            ? {
                ...a,
                status: newStatus || a.status,
                notes: notes !== null ? notes : a.notes,
              }
            : a
        )
      );
      if (selectedCandidate && selectedCandidate.id === appId) {
        setSelectedCandidate((prev) => ({
          ...prev,
          status: newStatus || prev.status,
          notes: notes !== null ? notes : prev.notes,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update application status");
    } finally {
      setActionLoading("");
    }
  };

  // Open Candidate Inspector Modal
  const handleOpenCandidateModal = (app) => {
    setSelectedCandidate(app);
    setCandidateNotes(app.notes || "");
  };

  const handleSaveCandidateNotes = async () => {
    if (!selectedCandidate) return;
    await handleUpdateAppStatus(selectedCandidate.id, selectedCandidate.status, candidateNotes);
  };

  // Circuit Breaker Controls
  const handleResetBreakers = async (connectorId = null) => {
    setActionLoading(connectorId ? `reset-${connectorId}` : "reset-all");
    setMessage("");
    setError("");
    try {
      const res = await adminService.resetConnectorBreakers(connectorId);
      setMessage(res.data.message || "Circuit breaker(s) successfully reset to CLOSED/HEALTHY.");
      const healthRes = await adminService.getConnectorHealth();
      setConnectors(healthRes.data.connectors || healthRes.data || {});
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset circuit breaker");
    } finally {
      setActionLoading("");
    }
  };

  // Scheduler Controls
  const handleToggleScheduler = async () => {
    setSchedulerLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await adminService.toggleScheduler();
      setMessage(res.data.message || "Scheduler state updated.");
      const schedRes = await adminService.getSchedulerStatus();
      setSchedulerStatus(schedRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to toggle scheduler");
    } finally {
      setSchedulerLoading(false);
    }
  };

  // Platform Announcement Banner
  const handleSaveAnnouncement = async (e) => {
    if (e) e.preventDefault();
    setActionLoading("announcement");
    setMessage("");
    setError("");
    try {
      const textToSave = announcementActive ? announcementDraft.trim() : "";
      const res = await adminService.updateAnnouncement(textToSave);
      setAnnouncement(res.data.announcement || "");
      setMessage(res.data.message || "Platform announcement updated successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update platform announcement");
    } finally {
      setActionLoading("");
    }
  };

  // Create Job
  const handleCreateJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const job = {
        title,
        company,
        location,
        description,
        source: source || "Admin Manual",
        applyLink,
        postedTime: new Date().toISOString(),
      };

      await jobService.createJob(job);
      setMessage("Job created and published successfully!");
      setTitle("");
      setCompany("");
      setLocation("");
      setDescription("");
      setSource("");
      setApplyLink("");
      loadAllData();
    } catch (err) {
      setError(err.response?.data || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm(`Are you sure you want to remove Job #${jobId}?`)) return;

    setActionLoading(`job-del-${jobId}`);
    try {
      await adminService.deleteJob(jobId);
      setMessage(`Job #${jobId} removed successfully.`);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (stats) {
        setStats((prev) => ({
          ...prev,
          totalJobs: Math.max(0, prev.totalJobs - 1),
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete job");
    } finally {
      setActionLoading("");
    }
  };

  // Aggregate Jobs
  const handleAggregate = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await jobService.aggregateJobs(
        keyword || null,
        searchLocation || null
      );
      setMessage(`Aggregation completed: ${response.data}`);
      loadAllData();
    } catch (err) {
      setError(err.response?.data || "Failed to trigger aggregation");
    } finally {
      setLoading(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !userSearch.trim() ||
        (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.phone && u.phone.includes(userSearch));

      const matchRole =
        roleFilter === "ALL" || (u.role && u.role.toUpperCase() === roleFilter);

      const matchProvider =
        providerFilter === "ALL" ||
        (u.provider && u.provider.toUpperCase() === providerFilter);

      return matchSearch && matchRole && matchProvider;
    });
  }, [users, userSearch, roleFilter, providerFilter]);

  return (
    <section className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-titles">
          <div className="admin-badge-live">
            <span className="live-dot" />
            Executive Admin Console
          </div>
          <h1>System Administration Dashboard</h1>
          <p className="admin-header-subtitle">
            Manage registered candidates, platform inventory, real-time ingestion pipelines, and application lifecycles.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportUsers}
            disabled={exportLoading === "users"}
            title="Download full candidate directory with phone, email, and verification status"
          >
            {exportLoading === "users" ? "Exporting..." : "📥 Candidates CSV"}
          </button>

          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportApplications}
            disabled={exportLoading === "applications"}
            title="Download active applications tracking pipeline"
          >
            {exportLoading === "applications" ? "Exporting..." : "📥 Applications CSV"}
          </button>

          <button
            type="button"
            className="btn-action-role"
            style={{ padding: "0.6rem 1.2rem", fontSize: "0.88rem" }}
            onClick={loadAllData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh Live Data"}
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      {message && <div className="ui-alert success">{message}</div>}
      {error && <div className="ui-alert error">{error}</div>}

      {/* Navigation Tabs */}
      <nav className="admin-tabs-nav">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview &amp; KPIs
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 User Directory
          <span className="tab-badge">{users.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "jobs" ? "active" : ""}`}
          onClick={() => setActiveTab("jobs")}
        >
          💼 Job Management
          <span className="tab-badge">
            {stats?.totalJobs ? stats.totalJobs.toLocaleString() : jobs.length}
          </span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "applications" ? "active" : ""}`}
          onClick={() => setActiveTab("applications")}
        >
          📑 Application Pipeline
          <span className="tab-badge">{applications.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "system" ? "active" : ""}`}
          onClick={() => setActiveTab("system")}
        >
          ⚡ System &amp; Connectors
          <span
            className="tab-badge"
            style={{
              background: schedulerStatus?.paused ? "#fef3c7" : "#dcfce7",
              color: schedulerStatus?.paused ? "#b45309" : "#15803d",
            }}
          >
            {schedulerStatus?.paused ? "PAUSED" : "ACTIVE"}
          </span>
        </button>
      </nav>

      {/* =========================================================
          TAB 1: OVERVIEW & KPIS
          ========================================================= */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* 4 KPI Cards */}
          <div className="admin-metrics-grid">
            <div className="metric-card users">
              <div className="metric-header">
                <span className="metric-title">Registered Users</span>
                <div className="metric-icon-box">👥</div>
              </div>
              <div className="metric-value">
                {stats?.totalUsers !== undefined ? stats.totalUsers : users.length}
              </div>
              <p className="metric-subtext">
                {stats?.userCount || 0} Regular Candidates • {stats?.adminCount || 1} Admins
              </p>
            </div>

            <div className="metric-card jobs">
              <div className="metric-header">
                <span className="metric-title">Active Opportunities</span>
                <div className="metric-icon-box">💼</div>
              </div>
              <div className="metric-value">
                {stats?.totalJobs !== undefined ? stats.totalJobs.toLocaleString() : "..."}
              </div>
              <p className="metric-subtext">Across 10+ verified career boards</p>
            </div>

            <div className="metric-card applications">
              <div className="metric-header">
                <span className="metric-title">Total Applications</span>
                <div className="metric-icon-box">📑</div>
              </div>
              <div className="metric-value">
                {stats?.totalApplications !== undefined ? stats.totalApplications : applications.length}
              </div>
              <p className="metric-subtext">Active candidate submissions</p>
            </div>

            <div className="metric-card admins">
              <div className="metric-header">
                <span className="metric-title">System Status</span>
                <div className="metric-icon-box">⚡</div>
              </div>
              <div className="metric-value" style={{ fontSize: "1.6rem" }}>
                {schedulerStatus?.paused ? "PAUSED" : "HEALTHY"}
              </div>
              <p className="metric-subtext">
                Scheduler: {schedulerStatus?.paused ? "Paused" : "Running every 30m"}
              </p>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div
            className="admin-section-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              color: "#ffffff",
            }}
          >
            <div>
              <h3 style={{ color: "#ffffff", fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                Data Exports &amp; Audit Tools
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
                Download clean, UTF-8 formatted CSV spreadsheets for executive reporting or offline candidate auditing.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-export-csv"
                style={{ background: "rgba(255, 255, 255, 0.1)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.2)" }}
                onClick={handleExportUsers}
                disabled={exportLoading === "users"}
              >
                📥 Export {users.length} Candidates
              </button>
              <button
                type="button"
                className="btn-export-csv"
                style={{ background: "rgba(255, 255, 255, 0.1)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.2)" }}
                onClick={handleExportApplications}
                disabled={exportLoading === "applications"}
              >
                📥 Export {applications.length} Applications
              </button>
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="admin-section-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Live Job Platform Distribution</h3>
              <span className="metric-subtext">Real-time counts per aggregated board</span>
            </div>
            <div className="platform-chips-grid">
              {stats?.platformStats && stats.platformStats.length > 0 ? (
                stats.platformStats.map((p, idx) => (
                  <div key={idx} className="platform-chip">
                    <span>{p.platform}</span>
                    <span className="platform-count">
                      {Number(p.count).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="metric-subtext">Loading platform distribution data...</p>
              )}
            </div>
          </div>

          {/* Auth Provider Breakdown */}
          <div className="admin-section-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Candidate Authentication Breakdown</h3>
              <span className="metric-subtext">How registered users sign into JobHub</span>
            </div>
            <div className="platform-chips-grid">
              <div className="platform-chip">
                <span>Local Email &amp; Password</span>
                <span className="platform-count">{stats?.providerStats?.LOCAL || 0}</span>
              </div>
              <div className="platform-chip">
                <span>Google OAuth 2.0</span>
                <span className="platform-count">{stats?.providerStats?.GOOGLE || 0}</span>
              </div>
              <div className="platform-chip">
                <span>GitHub OAuth</span>
                <span className="platform-count">{stats?.providerStats?.GITHUB || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: USER DIRECTORY
          ========================================================= */}
      {activeTab === "users" && (
        <div className="admin-section-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">Registered User Directory</h3>
              <p className="admin-header-subtitle">
                Viewing {filteredUsers.length} of {users.length} total registered accounts
              </p>
            </div>

            <button
              type="button"
              className="btn-export-csv"
              onClick={handleExportUsers}
              disabled={exportLoading === "users"}
            >
              📥 Export Filtered CSV
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="table-toolbar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search candidates by name, email, or phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="toolbar-filters">
              <select
                className="filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admins Only</option>
                <option value="USER">Users Only</option>
              </select>

              <select
                className="filter-select"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="ALL">All Providers</option>
                <option value="LOCAL">Local Email/Password</option>
                <option value="GOOGLE">Google OAuth</option>
                <option value="GITHUB">GitHub OAuth</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-responsive-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Auth Method</th>
                  <th>Phone</th>
                  <th>Verification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const isCurrentAdmin =
                      currentAdminEmail &&
                      currentAdminEmail.toLowerCase() === (u.email || "").toLowerCase();

                    return (
                      <tr key={u.id}>
                        <td style={{ color: "#94a3b8", fontWeight: 700 }}>#{u.id}</td>
                        <td>
                          <div className="user-identity-cell">
                            <div className="user-avatar-circle">
                              {(u.name || u.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="user-identity-info">
                              <span className="user-name-title">
                                {u.name || "Unnamed Candidate"}
                                {isCurrentAdmin && (
                                  <span
                                    style={{
                                      marginLeft: "6px",
                                      fontSize: "0.7rem",
                                      color: "#2563eb",
                                      fontWeight: 700,
                                    }}
                                  >
                                    (You)
                                  </span>
                                )}
                              </span>
                              <span className="user-email-subtitle">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge-role ${
                              u.role === "ADMIN" ? "admin" : "user"
                            }`}
                          >
                            {u.role === "ADMIN" ? "🛡️ ADMIN" : "👤 USER"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge-provider ${
                              (u.provider || "LOCAL").toLowerCase()
                            }`}
                          >
                            {u.provider === "GOOGLE"
                              ? "Google"
                              : u.provider === "GITHUB"
                              ? "GitHub"
                              : "Password"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: u.phone ? "#0f172a" : "#94a3b8",
                            }}
                          >
                            {u.phone || "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge-status ${
                              u.emailVerified ? "interview" : "saved"
                            }`}
                          >
                            {u.emailVerified ? "✓ Verified" : "• Pending"}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions-cell">
                            <button
                              type="button"
                              className="btn-action-role"
                              onClick={() => handleToggleRole(u.id, u.role)}
                              disabled={actionLoading === `role-${u.id}` || isCurrentAdmin}
                              title={
                                isCurrentAdmin
                                  ? "Cannot change your own role"
                                  : u.role === "ADMIN"
                                  ? "Demote to standard User"
                                  : "Promote to Administrator"
                              }
                            >
                              {actionLoading === `role-${u.id}`
                                ? "Saving..."
                                : u.role === "ADMIN"
                                ? "Demote to User"
                                : "Promote to Admin"}
                            </button>

                            <button
                              type="button"
                              className="btn-action-delete"
                              onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                              disabled={actionLoading === `delete-${u.id}` || isCurrentAdmin}
                              title={
                                isCurrentAdmin
                                  ? "Cannot delete your own account"
                                  : "Delete user account"
                              }
                            >
                              {actionLoading === `delete-${u.id}` ? "..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}
                    >
                      No registered candidates match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: JOB MANAGEMENT & AGGREGATION
          ========================================================= */}
      {activeTab === "jobs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          <div className="admin-two-column">
            {/* Create Job Card */}
            <section className="admin-form-card">
              <h3 className="admin-card-title" style={{ marginBottom: "1rem" }}>
                Create &amp; Publish New Opportunity
              </h3>
              <form onSubmit={handleCreateJob} className="admin-form">
                <div className="form-grid-2">
                  <div>
                    <label>Job Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Full Stack Engineer"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Google / Microsoft"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label>Location / Remote</label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru, India or Remote"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Source / Badge</label>
                    <input
                      type="text"
                      placeholder="e.g. Direct Verified, Partner"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label>Application URL</label>
                  <input
                    type="url"
                    placeholder="https://company.com/careers/apply"
                    value={applyLink}
                    onChange={(e) => setApplyLink(e.target.value)}
                  />
                </div>

                <div>
                  <label>Role Description &amp; Responsibilities</label>
                  <textarea
                    placeholder="Enter full job specifications, required technologies, qualifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary-admin" disabled={loading}>
                  {loading ? "Publishing Job..." : "Publish Job to Platform"}
                </button>
              </form>
            </section>

            {/* Aggregator Control Card */}
            <section className="admin-form-card">
              <h3 className="admin-card-title" style={{ marginBottom: "0.5rem" }}>
                Live Platform Aggregator
              </h3>
              <p className="metric-subtext" style={{ marginBottom: "1.25rem" }}>
                Trigger immediate ingestion cycles across Adzuna, Arbeitnow, Jobicy, Remotive, and external sources.
              </p>

              <div className="admin-form">
                <div>
                  <label>Target Role / Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. React Developer, DevOps"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>

                <div>
                  <label>Target City / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Bengaluru, Remote"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn-aggregator"
                  onClick={handleAggregate}
                  disabled={loading}
                >
                  {loading ? "Aggregating Feeds..." : "⚡ Trigger Real-Time Ingestion"}
                </button>
              </div>
            </section>
          </div>

          {/* Recent Jobs Table */}
          <div className="admin-section-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Recent Job Inventory (Latest 50)</h3>
              <span className="metric-subtext">Live database records</span>
            </div>

            <div className="table-responsive-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <tr key={job.id}>
                        <td style={{ color: "#94a3b8", fontWeight: 700 }}>#{job.id}</td>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>{job.title}</td>
                        <td>{job.company}</td>
                        <td>{job.location}</td>
                        <td>
                          <span className="platform-chip" style={{ fontSize: "0.78rem" }}>
                            {job.source || "Generic"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-action-delete"
                            onClick={() => handleDeleteJob(job.id)}
                            disabled={actionLoading === `job-del-${job.id}`}
                          >
                            {actionLoading === `job-del-${job.id}` ? "..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}
                      >
                        No recent jobs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: APPLICATION PIPELINE & CANDIDATE INSPECTOR
          ========================================================= */}
      {activeTab === "applications" && (
        <div className="admin-section-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">Live Candidate Application Pipeline</h3>
              <p className="admin-header-subtitle">
                Review candidate profiles, inspect extracted skills, write recruiter notes, and update pipeline status in real-time.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span className="platform-chip">Total: {applications.length} Submissions</span>
              <button
                type="button"
                className="btn-export-csv"
                onClick={handleExportApplications}
                disabled={exportLoading === "applications"}
              >
                📥 Export Pipeline CSV
              </button>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Candidate</th>
                  <th>Target Role</th>
                  <th>Company</th>
                  <th>Platform</th>
                  <th>Pipeline Status</th>
                  <th>Submission Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length > 0 ? (
                  applications.map((app) => {
                    const statusVal = app.status || "SAVED";
                    const isUpdating = actionLoading === `app-status-${app.id}`;

                    return (
                      <tr key={app.id}>
                        <td style={{ color: "#94a3b8", fontWeight: 700 }}>#{app.id}</td>
                        <td>
                          <div className="user-identity-info">
                            <span className="user-name-title">
                              {app.user?.name || "Candidate"}
                            </span>
                            <span className="user-email-subtitle">
                              {app.user?.email || "No email"}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>
                          {app.job?.title || "Role Title"}
                        </td>
                        <td>{app.job?.company || "Company"}</td>
                        <td>
                          <span className="platform-chip" style={{ fontSize: "0.78rem" }}>
                            {app.job?.source || "Direct"}
                          </span>
                        </td>
                        <td>
                          <select
                            className="status-dropdown"
                            value={statusVal}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                            style={{
                              borderColor:
                                statusVal === "INTERVIEW" || statusVal === "SHORTLISTED"
                                  ? "#10b981"
                                  : statusVal === "REJECTED"
                                  ? "#ef4444"
                                  : "#cbd5e1",
                            }}
                          >
                            <option value="SAVED">Saved</option>
                            <option value="APPLIED">Applied</option>
                            <option value="INTERVIEW">Interview</option>
                            <option value="SHORTLISTED">Shortlisted</option>
                            <option value="OFFER">Offer Extended</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "#64748b" }}>
                          {app.savedAt
                            ? new Date(app.savedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-action-role"
                            onClick={() => handleOpenCandidateModal(app)}
                            title="Inspect candidate qualifications, skills, and recruiter notes"
                          >
                            🔍 Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}
                    >
                      No candidate applications recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: SYSTEM HEALTH, CONNECTORS & SCHEDULER
          ========================================================= */}
      {activeTab === "system" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Card 1: Background Scheduler Controller */}
          <div className="admin-section-card">
            <div className="admin-card-header">
              <div>
                <h3 className="admin-card-title">Background Ingestion Scheduler</h3>
                <p className="admin-header-subtitle">
                  Automated background worker that runs periodically to fetch fresh jobs from external career portals.
                </p>
              </div>

              <button
                type="button"
                className={schedulerStatus?.paused ? "btn-primary-admin" : "btn-action-delete"}
                style={{ padding: "0.6rem 1.4rem", fontSize: "0.88rem", fontWeight: 800 }}
                onClick={handleToggleScheduler}
                disabled={schedulerLoading}
              >
                {schedulerLoading
                  ? "Updating..."
                  : schedulerStatus?.paused
                  ? "▶ Resume Scheduler"
                  : "⏸ Pause Scheduler"}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.25rem",
                marginTop: "0.75rem",
              }}
            >
              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Worker State
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: schedulerStatus?.paused ? "#f59e0b" : "#10b981",
                      boxShadow: schedulerStatus?.paused
                        ? "0 0 8px rgba(245, 158, 11, 0.6)"
                        : "0 0 8px rgba(16, 185, 129, 0.6)",
                    }}
                  />
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    {schedulerStatus?.paused ? "PAUSED" : "RUNNING"}
                  </span>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Ingestion Frequency
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginTop: "0.35rem" }}>
                  Every 30 Minutes
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Last Cycle Status
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginTop: "0.35rem" }}>
                  {schedulerStatus?.message || "Active & Monitoring"}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Connector Health & Circuit Breakers */}
          <div className="admin-section-card">
            <div className="admin-card-header">
              <div>
                <h3 className="admin-card-title">Live Platform Connectors &amp; Circuit Breakers</h3>
                <p className="admin-header-subtitle">
                  Fault-tolerant circuit breaker protection against downstream API rate limits or failures.
                </p>
              </div>

              <button
                type="button"
                className="btn-action-role"
                onClick={() => handleResetBreakers(null)}
                disabled={actionLoading === "reset-all"}
                title="Reset all open/degraded breakers back to healthy"
              >
                {actionLoading === "reset-all" ? "Resetting..." : "↻ Reset All Breakers"}
              </button>
            </div>

            <div className="connectors-grid">
              {Object.keys(connectors).length > 0 ? (
                Object.entries(connectors).map(([id, info]) => {
                  const state = String(info.state || "CLOSED").toUpperCase();
                  const badgeClass =
                    state === "OPEN"
                      ? "open"
                      : state === "HALF_OPEN"
                      ? "half_open"
                      : "closed";

                  const failureCount = info.failureCount || 0;
                  const threshold = info.failureThreshold || 5;

                  return (
                    <div key={id} className="connector-card">
                      <div className="connector-header">
                        <span className="connector-name">{info.name || id}</span>
                        <span className={`circuit-badge ${badgeClass}`}>
                          {state === "CLOSED" ? "● HEALTHY" : `● ${state}`}
                        </span>
                      </div>

                      <div className="connector-meta">
                        <span>Failures</span>
                        <span style={{ fontWeight: 700, color: failureCount > 0 ? "#ef4444" : "#10b981" }}>
                          {failureCount} / {threshold}
                        </span>
                      </div>

                      <div className="connector-meta">
                        <span>Circuit</span>
                        <span style={{ fontWeight: 600 }}>{state}</span>
                      </div>

                      <div style={{ marginTop: "0.25rem" }}>
                        <button
                          type="button"
                          className="btn-action-role"
                          style={{ width: "100%", textAlign: "center" }}
                          onClick={() => handleResetBreakers(id)}
                          disabled={actionLoading === `reset-${id}`}
                        >
                          {actionLoading === `reset-${id}` ? "Resetting..." : "Reset Circuit"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="metric-subtext">No active connectors registered.</p>
              )}
            </div>
          </div>

          {/* Card 3: Platform Announcement Banner Manager */}
          <div className="admin-section-card">
            <div className="admin-card-header">
              <div>
                <h3 className="admin-card-title">Site-Wide Announcement Banner</h3>
                <p className="admin-header-subtitle">
                  Broadcast high-priority notifications to all visiting candidates and recruiters.
                </p>
              </div>
            </div>

            {/* Banner Live Preview */}
            {announcementDraft.trim().length > 0 && announcementActive && (
              <div className="announcement-bar-preview">
                <span>📢</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{announcementDraft}</span>
                <span style={{ fontSize: "0.72rem", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Live Preview
                </span>
              </div>
            )}

            <form onSubmit={handleSaveAnnouncement} className="admin-form">
              <div>
                <label>Announcement Message</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled maintenance this Sunday at 2:00 AM UTC. All job applications will remain active."
                  value={announcementDraft}
                  onChange={(e) => setAnnouncementDraft(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    textTransform: "none",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span>Activate banner across JobHub platform</span>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn-primary-admin"
                  style={{ maxWidth: "240px" }}
                  disabled={actionLoading === "announcement"}
                >
                  {actionLoading === "announcement" ? "Updating..." : "Save Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          CANDIDATE PROFILE & RESUME INSPECTOR MODAL
          ========================================================= */}
      {selectedCandidate && (
        <div
          className="candidate-modal-backdrop"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="candidate-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.25rem",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "1rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#2563eb",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Candidate Profile &amp; Submission #{selectedCandidate.id}
                </span>
                <h2
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: "0.25rem 0 0",
                  }}
                >
                  {selectedCandidate.user?.name || "Candidate Name"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ✕
              </button>
            </div>

            {/* Candidate Details Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                  EMAIL ADDRESS
                </span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 600, color: "#0f172a" }}>
                  {selectedCandidate.user?.email || "—"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                  PHONE NUMBER
                </span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 600, color: "#0f172a" }}>
                  {selectedCandidate.user?.phone || "Not provided"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                  TARGET ROLE
                </span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 700, color: "#2563eb" }}>
                  {selectedCandidate.job?.title || "Role"}
                </p>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                  COMPANY
                </span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: 600, color: "#0f172a" }}>
                  {selectedCandidate.job?.company || "Company"}
                </p>
              </div>
            </div>

            {/* Extracted Skills */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                EXTRACTED SKILLS &amp; TECHNOLOGIES
              </span>
              <div className="skills-tags-wrap">
                {selectedCandidate.user?.skills ? (
                  (typeof selectedCandidate.user.skills === "string"
                    ? selectedCandidate.user.skills.split(",")
                    : selectedCandidate.user.skills
                  ).map((skill, idx) => (
                    <span key={idx} className="tag-pill">
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                    React, Java, Spring Boot, PostgreSQL, Docker, Git
                  </span>
                )}
              </div>
            </div>

            {/* Recruiter Status Pipeline Stage */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                CHANGE PIPELINE STAGE
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                {["SAVED", "APPLIED", "INTERVIEW", "SHORTLISTED", "OFFER", "REJECTED"].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn-action-role ${
                        selectedCandidate.status === st ? "active-stage" : ""
                      }`}
                      style={{
                        background: selectedCandidate.status === st ? "#2563eb" : "#f1f5f9",
                        color: selectedCandidate.status === st ? "#ffffff" : "#475569",
                        borderColor: selectedCandidate.status === st ? "#2563eb" : "#cbd5e1",
                      }}
                      onClick={() => handleUpdateAppStatus(selectedCandidate.id, st, candidateNotes)}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Recruiter Internal Notes */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                RECRUITER INTERNAL NOTES
              </span>
              <textarea
                rows={3}
                style={{
                  width: "100%",
                  marginTop: "0.4rem",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.88rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                placeholder="Add interview assessment, salary expectations, recruiter notes..."
                value={candidateNotes}
                onChange={(e) => setCandidateNotes(e.target.value)}
              />
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn-action-delete"
                onClick={() => setSelectedCandidate(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn-primary-admin"
                style={{ maxWidth: "200px" }}
                onClick={handleSaveCandidateNotes}
                disabled={actionLoading === `app-status-${selectedCandidate.id}`}
              >
                {actionLoading === `app-status-${selectedCandidate.id}`
                  ? "Saving..."
                  : "Save Recruiter Notes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminPanel;
