import React, { useState } from "react";
import PlatformCard from "./PlatformCard";
import "../styles/platform-grid.css";

/**
 * PlatformGrid - Displays all job platforms in a responsive grid
 * Sections: "Explore More Platforms" with all available platforms
 */
const PlatformGrid = ({ platforms = [], platformLinks = {} }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  if (!platforms || platforms.length === 0) {
    return null;
  }

  /**
   * Handle "Explore Jobs" button click for any platform
   * Opens the platform with customized search link or base URL
   */
  const handleViewJobs = (platform) => {
    setSelectedPlatform(platform.name);

    // Get the customized search link or fallback to base URL
    const platformLink = platformLinks[platform.name] || platform.baseUrl;

    if (!platformLink) {
      console.warn(`No link found for platform: ${platform.name}`, {
        platformLinks,
        platformBaseUrl: platform.baseUrl,
        platform,
      });
      alert(`Unable to open ${platform.name}. Please try again.`);
      setTimeout(() => setSelectedPlatform(null), 1000);
      return;
    }

    // Open the platform search URL in new tab
    console.log(`Opening ${platform.name}:`, platformLink);
    window.open(platformLink, "_blank", "noopener,noreferrer");

    // Clear selection after 3 seconds
    setTimeout(() => setSelectedPlatform(null), 3000);
  };

  // Group platforms: API first, then Non-API
  const apiPlatforms = platforms.filter((p) => p.apiPlatform);
  const nonApiPlatforms = platforms.filter((p) => !p.apiPlatform);

  return (
    <section className="platform-grid-section">
      <div className="platform-grid-container">
        {/* Header */}
        <div className="platform-grid-header">
          <h2 className="platform-grid-title">📊 Explore All Job Platforms</h2>
          <p className="platform-grid-subtitle">
            Access jobs from {platforms.length}+ platforms including APIs and
            major job sites
          </p>
        </div>

        {/* API Platforms Section */}
        {apiPlatforms.length > 0 && (
          <div className="platform-category">
            <h3 className="platform-category-title">🔗 Live Job APIs</h3>
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
            <h3 className="platform-category-title">🌐 Popular Job Sites</h3>
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

        {/* Info Box */}
        <div className="platform-grid-info">
          <p>
            💡 <strong>Tip:</strong> Click "Explore Jobs" to search across
            different platforms. API platforms show jobs in the "Top Jobs"
            section.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PlatformGrid;
