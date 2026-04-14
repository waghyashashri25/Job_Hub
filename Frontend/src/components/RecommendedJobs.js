import React, { useMemo } from "react";
import JobCard from "./JobCard";
import "../styles/dashboard.css";

const RecommendedJobs = ({ jobs = [], savedJobIds = new Set() }) => {
  const recommendations = useMemo(() => {
    if (!jobs || jobs.length < 3) {
      return [];
    }

    // Get saved jobs for analysis
    const saved = Array.from(savedJobIds);

    if (saved.length === 0) {
      // If no saved jobs, return top-rated jobs (by match/recency)
      return jobs.slice(0, 3).map((job, idx) => ({
        job,
        reason: `Trending in ${job.source || "our platform"}`,
        icon: "🔥",
      }));
    }

    // Find similarities with saved jobs
    const recommendations = [];
    const recommendedIds = new Set();

    jobs.forEach((job) => {
      if (savedJobIds.has(job.id) || recommendedIds.has(job.id)) {
        return; // Skip already saved or recommended
      }

      let matchScore = 0;
      let reason = "";
      let icon = "";

      // Check if same company
      const sameCompanyJobs = jobs.filter(
        (j) => j.company === job.company && savedJobIds.has(j.id),
      );

      if (sameCompanyJobs.length > 0) {
        reason = `Similar to your saved "${sameCompanyJobs[0].title}" role`;
        icon = "🏢";
        matchScore += 10;
      }

      // Check if same location
      const sameLocationJobs = jobs.filter(
        (j) => j.location === job.location && savedJobIds.has(j.id),
      );

      if (sameLocationJobs.length > 0) {
        reason = `Based on your interest in ${job.location} roles`;
        icon = "📍";
        matchScore += 8;
      }

      // Check if same source
      const sameSourceJobs = jobs.filter(
        (j) => j.source === job.source && savedJobIds.has(j.id),
      );

      if (sameSourceJobs.length > 0) {
        reason = `From your preferred platform: ${job.source}`;
        icon = "⭐";
        matchScore += 6;
      }

      // Generic recommendation
      if (matchScore === 0) {
        reason = "We think you might like this";
        icon = "✨";
        matchScore = 3;
      }

      recommendations.push({
        job,
        reason,
        icon,
        matchScore,
      });
    });

    // Sort by match score and take top 3
    return recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }, [jobs, savedJobIds]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="recommended-jobs-section">
      <div className="dashboard-section-header">
        <h2>Recommended for You 💡</h2>
        <p className="section-subtitle">
          Based on your saved jobs and preferences
        </p>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((rec, index) => (
          <div key={index} className="recommendation-wrapper">
            <div className="recommendation-badge">
              <span className="badge-icon">{rec.icon}</span>
              <span className="badge-text">{rec.reason}</span>
            </div>
            <div className="recommendation-card-container">
              {/* Note: We're not including JobCard here to avoid prop issues
                  Instead, showing a simplified view */}
              <div className="simple-job-card">
                <h4 className="simple-title">{rec.job.title}</h4>
                <p className="simple-company">{rec.job.company}</p>
                <p className="simple-location">📍 {rec.job.location}</p>
                <p className="simple-source">{rec.job.source}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendedJobs;
