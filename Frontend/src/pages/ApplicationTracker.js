import React, { useState, useEffect } from "react";
import { applicationService } from "../services/apiService";
import "../styles/applications.css";

const ApplicationTracker = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await applicationService.getApplications();
      console.debug(
        "[ApplicationTracker] Applications fetched:",
        response.data,
      );
      setApplications(response.data || []);
    } catch (err) {
      console.error("[ApplicationTracker] Error fetching applications:", err);
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

  const getStatusColor = (status) => {
    switch (status) {
      case "SAVED":
        return "status-saved";
      case "APPLIED":
        return "status-applied";
      case "INTERVIEW":
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
    </section>
  );
};

export default ApplicationTracker;
