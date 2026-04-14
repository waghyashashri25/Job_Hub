import React, { useMemo } from "react";
import { enrichJobWithAnalysis } from "../../services/jobMatchingService";
import "../../styles/tabs.css";

const InsightsTab = ({ jobs, savedJobIds, userSkills = [] }) => {
  const insights = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return null;
    }

    // Enrich all jobs with analysis using user skills
    const enrichedJobs = jobs.map((job) =>
      enrichJobWithAnalysis(job, userSkills),
    );

    // Calculate statistics
    const matchPercentages = enrichedJobs.map(
      (j) => j.analysis.matchPercentage,
    );
    const interviewProbabilities = enrichedJobs.map(
      (j) => j.analysis.interviewProbability,
    );

    const avgMatch = Math.round(
      matchPercentages.reduce((a, b) => a + b, 0) / matchPercentages.length,
    );
    const avgInterview = Math.round(
      interviewProbabilities.reduce((a, b) => a + b, 0) /
        interviewProbabilities.length,
    );

    const matchDistribution = {
      high: enrichedJobs.filter((j) => j.analysis.matchPercentage >= 75).length,
      medium: enrichedJobs.filter(
        (j) =>
          j.analysis.matchPercentage >= 50 && j.analysis.matchPercentage < 75,
      ).length,
      low: enrichedJobs.filter((j) => j.analysis.matchPercentage < 50).length,
    };

    // Top matching jobs
    const topMatches = enrichedJobs
      .sort((a, b) => b.analysis.matchPercentage - a.analysis.matchPercentage)
      .slice(0, 5);

    // Best interview probability
    const bestOpportunities = enrichedJobs
      .sort(
        (a, b) =>
          b.analysis.interviewProbability - a.analysis.interviewProbability,
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
          <p className="empty-icon">🧠</p>
          <h3>No Data Available</h3>
          <p>Load jobs to see AI insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-tab">
      {/* Header */}
      <div className="tab-header">
        <h1>AI-Powered Insights</h1>
        <p className="subtitle">
          Intelligent job matching and opportunity analysis
        </p>
      </div>

      {/* Summary Metrics */}
      <section className="insights-section">
        <h2>📊 Your Matching Score</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <p className="metric-label">Average Match %</p>
            <p className="metric-value large">{insights.avgMatch}%</p>
            <p className="metric-description">
              Across {insights.totalJobs} jobs
            </p>
          </div>

          <div className="metric-card">
            <p className="metric-label">Average Interview Chance</p>
            <p className="metric-value large">{insights.avgInterview}%</p>
            <p className="metric-description">AI-calculated probability</p>
          </div>
        </div>
      </section>

      {/* Match Distribution */}
      <section className="insights-section">
        <h2>🎯 Match Distribution</h2>
        <div className="distribution-bars">
          <div className="distribution-item">
            <div className="distribution-bar">
              <div
                className="distribution-fill high"
                style={{
                  width: `${(insights.matchDistribution.high / insights.totalJobs) * 100}%`,
                }}
              />
            </div>
            <p className="distribution-label">
              <span className="badge high">High</span>
              <span className="count">{insights.matchDistribution.high}</span>
            </p>
          </div>

          <div className="distribution-item">
            <div className="distribution-bar">
              <div
                className="distribution-fill medium"
                style={{
                  width: `${(insights.matchDistribution.medium / insights.totalJobs) * 100}%`,
                }}
              />
            </div>
            <p className="distribution-label">
              <span className="badge medium">Medium</span>
              <span className="count">{insights.matchDistribution.medium}</span>
            </p>
          </div>

          <div className="distribution-item">
            <div className="distribution-bar">
              <div
                className="distribution-fill low"
                style={{
                  width: `${(insights.matchDistribution.low / insights.totalJobs) * 100}%`,
                }}
              />
            </div>
            <p className="distribution-label">
              <span className="badge low">Low</span>
              <span className="count">{insights.matchDistribution.low}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Top Matches */}
      <section className="insights-section">
        <h2>🏆 Your Best Matches</h2>
        <div className="top-matches-list">
          {insights.topMatches.map((job, idx) => (
            <div key={job.id} className="match-item">
              <div className="match-rank">#{idx + 1}</div>
              <div className="match-info">
                <h4>{job.title}</h4>
                <p className="match-company">{job.company}</p>
                <p className="match-location">📍 {job.location}</p>
              </div>
              <div className="match-score">
                <p className="score-value">{job.analysis.matchPercentage}%</p>
                <p className="score-label">Match</p>
              </div>
              <div
                className="match-indicator"
                style={{
                  background: job.analysis.confidenceColor,
                  opacity: 0.3,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Best Opportunities */}
      <section className="insights-section">
        <h2>⭐ Best Opportunities (By Interview Chance)</h2>
        <div className="opportunities-list">
          {insights.bestOpportunities.map((job, idx) => (
            <div key={job.id} className="opportunity-item">
              <div className="opp-header">
                <div className="opp-info">
                  <h4>{job.title}</h4>
                  <p className="opp-company">{job.company}</p>
                </div>
                <div className="opp-scores">
                  <div className="score-box">
                    <span className="label">Match:</span>
                    <span
                      className="value"
                      style={{ color: job.analysis.confidenceColor }}
                    >
                      {job.analysis.matchPercentage}%
                    </span>
                  </div>
                  <div className="score-box">
                    <span className="label">Interview:</span>
                    <span
                      className="value"
                      style={{ color: job.analysis.confidenceColor }}
                    >
                      {job.analysis.interviewProbability}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="opp-skills">
                {job.analysis.skillGap.matched.length > 0 && (
                  <div className="skills-section">
                    <p className="skills-label">
                      Your Skills ({job.analysis.skillGap.matched.length}):
                    </p>
                    <div className="skill-tags">
                      {job.analysis.skillGap.matched.slice(0, 4).map((s, i) => (
                        <span key={i} className="skill-tag matched">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.analysis.skillGap.missing.length > 0 && (
                  <div className="skills-section">
                    <p className="skills-label">
                      Learn ({job.analysis.skillGap.missing.length}):
                    </p>
                    <div className="skill-tags">
                      {job.analysis.skillGap.missing.slice(0, 4).map((s, i) => (
                        <span key={i} className="skill-tag missing">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default InsightsTab;
