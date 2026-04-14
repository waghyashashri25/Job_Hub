import React, { useMemo } from "react";
import "../../styles/tabs.css";

const ApplicationsTab = ({ applications, onUpdateStatus }) => {
  const applicationsByStatus = useMemo(() => {
    const grouped = {
      SAVED: [],
      APPLIED: [],
      INTERVIEW: [],
      OFFER: [],
      REJECTED: [],
    };

    applications.forEach((app) => {
      const status = app.status || "SAVED";
      if (grouped[status]) {
        grouped[status].push(app);
      }
    });

    return grouped;
  }, [applications]);

  const statusConfig = {
    SAVED: { label: "Saved", icon: "💾", color: "#4a63ff" },
    APPLIED: { label: "Applied", icon: "✉️", color: "#f59e0b" },
    INTERVIEW: { label: "Interview", icon: "🎤", color: "#8b5cf6" },
    OFFER: { label: "Offer", icon: "🎉", color: "#17b890" },
    REJECTED: { label: "Rejected", icon: "❌", color: "#d44f6f" },
  };

  const handleStatusChange = (applicationId, newStatus) => {
    onUpdateStatus(applicationId, newStatus);
  };

  const StatusBadge = ({ status, applicationId }) => (
    <div className="status-selector">
      <select
        value={status}
        onChange={(e) => handleStatusChange(applicationId, e.target.value)}
        className={`status-select status-${status.toLowerCase()}`}
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
    <div className="applications-tab">
      {/* Header */}
      <div className="tab-header">
        <h1>Application Tracker</h1>
        <p className="subtitle">
          Monitor all your job applications and their status
        </p>
      </div>

      {applications.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="summary-card">
                <span className="icon">{config.icon}</span>
                <div className="summary-info">
                  <p className="summary-label">{config.label}</p>
                  <p className="summary-count">
                    {applicationsByStatus[status].length}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Status Sections */}
          <div className="applications-sections">
            {Object.entries(statusConfig).map(([status, config]) => {
              const statusApps = applicationsByStatus[status];
              if (statusApps.length === 0) return null;

              return (
                <section key={status} className="status-section">
                  <h2 className="section-title">
                    <span className="section-icon">{config.icon}</span>
                    {config.label} ({statusApps.length})
                  </h2>

                  <div className="applications-list">
                    {statusApps.map((app) => (
                      <div key={app.id} className="application-card">
                        <div className="app-header">
                          <div className="app-title-section">
                            <h3 className="app-job-title">
                              {app.job?.title || app.jobId}
                            </h3>
                            <p className="app-company">
                              {app.job?.company || "Company"}
                            </p>
                          </div>
                          <StatusBadge status={status} applicationId={app.id} />
                        </div>

                        <div className="app-details">
                          {app.job?.location && (
                            <p className="detail-item">
                              <span className="icon">📍</span>
                              {app.job.location}
                            </p>
                          )}
                          {app.job?.source && (
                            <p className="detail-item">
                              <span className="icon">🔗</span>
                              {app.job.source}
                            </p>
                          )}
                          {app.appliedDate && (
                            <p className="detail-item">
                              <span className="icon">📅</span>
                              Applied:{" "}
                              {new Date(app.appliedDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {app.job?.applyLink && (
                          <div className="app-actions">
                            <a
                              href={app.job.applyLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-small"
                            >
                              View Job
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p className="empty-icon">📂</p>
          <h3>No Applications Yet</h3>
          <p>Save jobs and track your applications here</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationsTab;
