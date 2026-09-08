import React, { useState } from "react";
import PlatformCard from "../PlatformCard";
import { buildPlatformUrl } from "../../utils/linkHelper";
import "../../styles/platform-grid.css";
import "../../styles/tabs.css";

const PlatformsTab = ({
  platforms = [],
  platformLinks = {},
}) => {
  const [filterType, setFilterType] = useState("all"); // "all", "api", "sites"
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const handleViewJobs = (platform) => {
    setSelectedPlatform(platform.name);
    const platformLink = platformLinks[platform.name] || buildPlatformUrl(platform.name, "Software Engineer", "") || platform.baseUrl;

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

  const displayedPlatforms =
    filterType === "api"
      ? apiPlatforms
      : filterType === "sites"
      ? nonApiPlatforms
      : platforms;

  return (
    <div
      className="platforms-tab-container"
      style={{
        display: "grid",
        gap: "2rem",
        width: "100%",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        className="tab-header"
        style={{ textAlign: "center", marginBottom: "0.5rem" }}
      >
        <h1 style={{ color: "#0f172a", fontSize: "2rem", fontWeight: 800 }}>
          Multi-Platform Job Discovery Directory
        </h1>
        <p className="subtitle" style={{ color: "#64748b", fontSize: "1rem" }}>
          Discover and explore career opportunities across 18+ leading global and regional job platforms.
        </p>
      </div>

      {/* Filter Category Chips */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "0.5rem",
        }}
      >
        <button
          className={`btn ${filterType === "all" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setFilterType("all")}
          style={{ padding: "0.45rem 1rem", fontSize: "0.88rem", borderRadius: "8px" }}
        >
          All Platforms ({platforms.length})
        </button>
        <button
          className={`btn ${filterType === "api" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setFilterType("api")}
          style={{ padding: "0.45rem 1rem", fontSize: "0.88rem", borderRadius: "8px" }}
        >
          Live Aggregation APIs ({apiPlatforms.length})
        </button>
        <button
          className={`btn ${filterType === "sites" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setFilterType("sites")}
          style={{ padding: "0.45rem 1rem", fontSize: "0.88rem", borderRadius: "8px" }}
        >
          Major Job Sites & Portals ({nonApiPlatforms.length})
        </button>
      </div>

      {/* 18+ Connected Platform Cards Grid */}
      <div className="platform-grid">
        {displayedPlatforms.map((platform, index) => (
          <PlatformCard
            key={`${platform.name}-${index}`}
            platform={platform}
            onViewJobs={handleViewJobs}
            isSelected={selectedPlatform === platform.name}
          />
        ))}
      </div>
    </div>
  );
};

export default PlatformsTab;
