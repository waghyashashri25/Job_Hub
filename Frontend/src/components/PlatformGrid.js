import React, { useState } from "react";
import PlatformCard from "./PlatformCard";
import "../styles/platform-grid.css";

const PlatformGrid = ({ platforms = [], platformLinks = {} }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  if (!platforms || platforms.length === 0) {
    return null;
  }

  const handleViewJobs = (platform) => {
    setSelectedPlatform(platform.name);
    const platformLink = platformLinks[platform.name] || platform.baseUrl;

    if (!platformLink) {
      alert(`Unable to open ${platform.name}. Please try again.`);
      setTimeout(() => setSelectedPlatform(null), 1000);
      return;
    }

    window.open(platformLink, "_blank", "noopener,noreferrer");
    setTimeout(() => setSelectedPlatform(null), 3000);
  };

  const apiPlatforms = platforms.filter((p) => p.apiPlatform);
  const nonApiPlatforms = platforms.filter((p) => !p.apiPlatform);

  return (
    <section className="platform-grid-section">
      <div className="platform-grid-container">
        {/* Header */}
        <div className="platform-grid-header">
          <h2 className="platform-grid-title">Multi-Platform Discovery Directory</h2>
          <p className="platform-grid-subtitle">
            Access opportunities aggregated from {platforms.length}+ platforms and major recruitment networks
          </p>
        </div>

        {/* API Platforms Section */}
        {apiPlatforms.length > 0 && (
          <div className="platform-category">
            <h3 className="platform-category-title">Live Job Aggregation Sources</h3>
            <div className="platform-grid">
              {apiPlatforms.map((platform, index) => (
                <PlatformCard
                  key={`api-${index}`}
                  platform={platform}
                  onViewJobs={handleViewJobs}
                  isSelected={selectedPlatform === platform.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Non-API Platforms Section */}
        {nonApiPlatforms.length > 0 && (
          <div className="platform-category">
            <h3 className="platform-category-title">Enterprise Job Boards & Direct Portals</h3>
            <div className="platform-grid">
              {nonApiPlatforms.map((platform, index) => (
                <PlatformCard
                  key={`non-api-${index}`}
                  platform={platform}
                  onViewJobs={handleViewJobs}
                  isSelected={selectedPlatform === platform.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PlatformGrid;
