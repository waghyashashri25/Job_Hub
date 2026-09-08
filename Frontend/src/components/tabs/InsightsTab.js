import React, { useMemo } from "react";
import { enrichJobWithAnalysis } from "../../services/jobMatchingService";
import "../../styles/tabs.css";

const InsightsTab = ({ jobs, savedJobIds, userSkills = [] }) => {
  const insights = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return null;
    }

    const enrichedJobs = jobs.map((job) =>
      enrichJobWithAnalysis(job, userSkills)
    );

    const matchPercentages = enrichedJobs.map((j) => j.analysis.matchPercentage);
    const interviewProbabilities = enrichedJobs.map((j) => j.analysis.interviewProbability);

    const avgMatch = Math.round(
      matchPercentages.reduce((a, b) => a + b, 0) / matchPercentages.length
    );
    const avgInterview = Math.round(
      interviewProbabilities.reduce((a, b) => a + b, 0) /
        interviewProbabilities.length
    );

    const matchDistribution = {
      high: enrichedJobs.filter((j) => j.analysis.matchPercentage >= 75).length,
      medium: enrichedJobs.filter(
        (j) => j.analysis.matchPercentage >= 50 && j.analysis.matchPercentage < 75
      ).length,
      low: enrichedJobs.filter((j) => j.analysis.matchPercentage < 50).length,
    };

    const topMatches = enrichedJobs
      .sort((a, b) => b.analysis.matchPercentage - a.analysis.matchPercentage)
      .slice(0, 5);

    const bestOpportunities = enrichedJobs
      .sort(
        (a, b) =>
          b.analysis.interviewProbability - a.analysis.interviewProbability
      )
      .slice(0, 5);

    return {
      avgMatch,
      avgInterview,
      matchDistribution,
      topMatches,
      bestOpportunities,
      totalJobs: enrichedJobs.length,
    };
  }, [jobs, userSkills]);

  if (!insights) {
    return (
      <div className="insights-tab">
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: "1rem" }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <h3>No Data Available</h3>
          <p>Search and load jobs to inspect AI insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-tab">
      {/* Header */}
      <div className="tab-header">
        <h1>AI-Powered Opportunity Insights</h1>
        <p className="subtitle">
          Intelligent job matching and interview probability analysis across active listings
        </p>
      </div>

      {/* Summary Metrics */}
      <section className="insights-section">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem" }}>
          Candidate Match Diagnostics
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "12px", textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: "0.82rem", textTransform: "uppercase", fontWeight: 700, margin: "0 0 0.25rem" }}>Average Match Percentage</p>
            <p style={{ fontSize: "2.25rem", fontWeight: 900, color: "#2563eb", margin: 0 }}>{insights.avgMatch}%</p>
            <p style={{ color: "#64748b", fontSize: "0.82rem", margin: "4px 0 0" }}>Across {insights.totalJobs} live jobs</p>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.5rem", borderRadius: "12px", textAlign: "center" }}>
            <p style={{ color: "#64748b", fontSize: "0.82rem", textTransform: "uppercase", fontWeight: 700, margin: "0 0 0.25rem" }}>Average Interview Probability</p>
            <p style={{ fontSize: "2.25rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>{insights.avgInterview}%</p>
            <p style={{ color: "#64748b", fontSize: "0.82rem", margin: "4px 0 0" }}>Skill alignment calculation</p>
          </div>
        </div>
      </section>

      {/* Match Distribution */}
      <section className="insights-section">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem" }}>
          Match Tier Distribution
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "1.25rem", borderRadius: "10px", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>High Match (&gt;75%)</span>
            <p style={{ fontSize: "1.75rem", fontWeight: 900, color: "#166534", margin: "0.25rem 0 0" }}>{insights.matchDistribution.high}</p>
          </div>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "1.25rem", borderRadius: "10px", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>Moderate Match (50-74%)</span>
            <p style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1d4ed8", margin: "0.25rem 0 0" }}>{insights.matchDistribution.medium}</p>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "10px", textAlign: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Growth Roles (&lt;50%)</span>
            <p style={{ fontSize: "1.75rem", fontWeight: 900, color: "#64748b", margin: "0.25rem 0 0" }}>{insights.matchDistribution.low}</p>
          </div>
        </div>
      </section>

      {/* Top Matches */}
      <section className="insights-section">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem" }}>
          Highest Matching Roles for Your Skill Profile
        </h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {insights.topMatches.map((job, idx) => (
            <div key={job.id ? `match-${job.id}` : `match-${idx}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Rank #{idx + 1}</span>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "2px 0" }}>{job.title}</h4>
                <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>{job.company} • {job.location}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2563eb" }}>{job.analysis.matchPercentage}%</span>
                <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase" }}>Match</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default InsightsTab;
