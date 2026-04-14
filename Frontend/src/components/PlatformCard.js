import React from "react";
import "../styles/platform-grid.css";

/**
 * PlatformCard - Displays a single job platform with action button
 * Used in "Explore More Platforms" section
 */
const PlatformCard = ({ platform, onViewJobs }) => {
  if (!platform) return null;

  const { name, description, icon, apiPlatform } = platform;

  return (
    <div className="platform-card">
      {/* Icon/Badge */}
      <div className="platform-icon">{icon || "💼"}</div>

      {/* Platform Name */}
      <h3 className="platform-name">{name}</h3>

      {/* Description */}
      <p className="platform-description">{description}</p>

      {/* Badge: API or Non-API */}
      <div className={`platform-badge ${apiPlatform ? "api" : "redirect"}`}>
        {apiPlatform ? "API Platform" : "View Jobs"}
      </div>

      {/* Action Button */}
      <button
        className="platform-button"
        onClick={() => onViewJobs(platform)}
        title={`Search ${name} for jobs`}
      >
        Explore Jobs
      </button>
    </div>
  );
};

export default PlatformCard;
