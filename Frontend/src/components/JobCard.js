import React, { useMemo } from "react";
import { enrichJobWithAnalysis } from "../services/jobMatchingService";
import "../styles/jobcard-enhanced.css";

const JobCard = ({ job, isSaved, onSave, onApply, userSkills = null }) => {
  // Enrich job with AI analysis using user's real skills
  // Must be called before any early returns to follow Rules of Hooks
  const enrichedJob = useMemo(() => {
    if (!job) {
      console.warn("JobCard: job prop is missing");
      return {
        analysis: {
          matchPercentage: 0,
          confidenceLevel: "LOW",
          confidenceColor: "#d44f6f",
          interviewProbability: 0,
          skillGap: { matched: [], missing: [] },
        },
      };
    }
    try {
      return enrichJobWithAnalysis(job, userSkills);
    } catch (error) {
      console.error("Error enriching job:", error);
      // Return default analysis if enrichment fails
      return {
        analysis: {
          matchPercentage: 0,
          confidenceLevel: "LOW",
          confidenceColor: "#d44f6f",
          interviewProbability: 0,
          skillGap: { matched: [], missing: [] },
        },
      };
    }
  }, [job, userSkills]);

  // Validate props after hooks are called
  if (!job) {
    console.warn("JobCard: job prop is missing");
    return (
      <article className="job-card">
        <p style={{ color: "#d44f6f", padding: "1rem" }}>
          Error: Job data is missing
        </p>
      </article>
    );
  }

  const { analysis } = enrichedJob;

  const handleApplyClick = () => {
    try {
      if (!job?.applyLink) {
        alert("This job does not have a valid apply link.");
        return;
      }
      onApply(job.applyLink);
    } catch (error) {
      console.error("Error applying to job:", error);
      alert("Error applying to this job. Please try again.");
    }
  };

  // Sanitize and render HTML description from API
  const sanitizeHtml = (html) => {
    try {
      if (!html || typeof html !== "string") {
        return "<p>No description provided.</p>";
      }

      let cleaned = html;

      // Remove script tags and content
      cleaned = cleaned.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );

      // Remove event handlers (onclick, onerror, etc.)
      cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
      cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");

      // Remove dangerous protocols in links
      cleaned = cleaned.replace(
        /href\s*=\s*["']javascript:[^"']*["']/gi,
        'href="#"',
      );

      return cleaned;
    } catch (error) {
      console.error("Error sanitizing HTML:", error);
      // Fallback: return escaped text
      return `<p>${(html || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
    }
  };

  return (
    <article className="job-card">
      {/* Header: Title, Company, Source Badge */}
      <div className="job-card-header">
        <div className="job-card-title-section">
          <h3 className="job-title">{job?.title || "Job Title"}</h3>
          <p className="job-company">{job?.company || "Company"}</p>
        </div>
        <span className="source-badge">{job?.source || "Unknown"}</span>
      </div>

      {/* Location & Posted Time */}
      <div className="job-meta">
        <p className="job-location">
          <span className="location-icon">📍</span> {job?.location || "Remote"}
        </p>
      </div>

      {/* AI Analysis Section - Top Priority Display */}
      <div className="job-analysis-compact">
        {/* Match Percentage Badge */}
        {analysis && (
          <>
            <div
              className="match-badge"
              style={{
                backgroundColor: analysis.confidenceColor || "#d44f6f",
              }}
            >
              <div className="match-percentage">
                {analysis.matchPercentage || 0}%
              </div>
              <div className="match-label">Match</div>
            </div>

            {/* Confidence Level Badge */}
            <div
              className={`confidence-badge confidence-${(
                analysis.confidenceLevel || "low"
              ).toLowerCase()}`}
              style={{
                borderColor: analysis.confidenceColor || "#d44f6f",
              }}
            >
              {analysis.confidenceLevel || "Low"}
            </div>

            {/* Interview Probability */}
            <div className="interview-badge">
              <div className="interview-prob">
                {analysis.interviewProbability || 0}%
              </div>
              <div className="interview-label">Interview</div>
            </div>
          </>
        )}
      </div>

      {/* Description - Scrollable, Full Content, Rendered as HTML */}
      <div className="job-description-section">
        <div
          className="job-description-scrollable"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(job.description),
          }}
        />
      </div>

      {/* Skill Analysis */}
      {analysis && analysis.skillGap && (
        <div className="skill-analysis">
          {/* Matched Skills */}
          {analysis.skillGap.matched &&
            analysis.skillGap.matched.length > 0 && (
              <div className="skill-group matched-skills-group">
                <div className="skill-group-label">
                  Your Skills ({analysis.skillGap.matched.length})
                </div>
                <div className="skills-list">
                  {analysis.skillGap.matched.slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="skill-tag matched">
                      ✓ {skill}
                    </span>
                  ))}
                  {analysis.skillGap.matched.length > 4 && (
                    <span className="skill-tag more">
                      +{analysis.skillGap.matched.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* Missing Skills */}
          {analysis.skillGap.missing &&
            analysis.skillGap.missing.length > 0 && (
              <div className="skill-group missing-skills-group">
                <div className="skill-group-label">
                  Missing Skills ({analysis.skillGap.missing.length})
                </div>
                <div className="skills-list">
                  {analysis.skillGap.missing.slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="skill-tag missing">
                      {skill}
                    </span>
                  ))}
                  {analysis.skillGap.missing.length > 4 && (
                    <span className="skill-tag more">
                      +{analysis.skillGap.missing.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="job-card-actions">
        <button
          type="button"
          className="btn btn-apply"
          onClick={handleApplyClick}
          title="Apply for this job in a new tab"
        >
          Apply Now
        </button>
        <button
          type="button"
          className={`btn btn-save ${isSaved ? "saved" : ""}`}
          onClick={() => job?.id && onSave(job.id)}
          disabled={isSaved}
          title={isSaved ? "Job saved" : "Save this job"}
        >
          {isSaved ? "✓ Saved" : "Save"}
        </button>
      </div>
    </article>
  );
};

export default JobCard;
