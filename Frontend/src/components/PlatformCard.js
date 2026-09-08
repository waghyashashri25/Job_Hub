import React from "react";
import "../styles/platform-grid.css";

const PlatformCard = ({ platform, onViewJobs, isSelected }) => {
  if (!platform) return null;

  const { name, description, apiPlatform } = platform;

  return (
    <div className={`platform-card ${isSelected ? "selected" : ""}`}>
      <div className="platform-card-top">
        <div className="platform-icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <span className={`platform-badge ${apiPlatform ? "api" : "redirect"}`}>
          {apiPlatform ? "Live API" : "Deep Search"}
        </span>
      </div>

      <h3 className="platform-name">{name}</h3>
      <p className="platform-description">{description}</p>

      <button
        className="platform-button"
        onClick={() => onViewJobs(platform)}
        title={`Search ${name} for jobs`}
      >
        <span>Explore Platform</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
      </button>
    </div>
  );
};

export default PlatformCard;
