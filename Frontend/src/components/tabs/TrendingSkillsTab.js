import React, { useMemo } from "react";
import { extractSkillsFromJob } from "../../services/jobMatchingService";
import "../../styles/tabs.css";

const TrendingSkillsTab = ({ jobs }) => {
  const trendingSkills = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return [];
    }

    const skillCounts = {};

    jobs.forEach((job) => {
      const skills = extractSkillsFromJob(job.description);
      skills.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    return Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skill,
        count,
        percentage: Math.round((count / jobs.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 24);
  }, [jobs]);

  const maxCount = useMemo(() => {
    if (trendingSkills.length === 0) return 0;
    return Math.max(...trendingSkills.map((s) => s.count));
  }, [trendingSkills]);

  const topCategories = useMemo(() => {
    const categories = {
      frontend: [
        "React",
        "Vue",
        "Angular",
        "TypeScript",
        "JavaScript",
        "CSS",
        "HTML",
      ],
      backend: [
        "Java",
        "Spring Boot",
        "Spring",
        "Python",
        "Django",
        "Node.js",
        "Express",
        "Go",
        "Rust",
      ],
      databases: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch"],
      devops: ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD"],
    };

    return Object.entries(categories).map(([category, skills]) => ({
      category,
      skills: trendingSkills.filter((ts) => skills.includes(ts.skill)),
    }));
  }, [trendingSkills]);

  return (
    <div className="trending-skills-tab">
      {/* Header */}
      <div className="tab-header">
        <h1>Trending Technical Skills Market</h1>
        <p className="subtitle">
          Real-time in-demand skills aggregated across {jobs.length} active job listings
        </p>
      </div>

      {trendingSkills.length > 0 ? (
        <>
          {/* Overall Trending Skills */}
          <section className="trending-section">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem" }}>
              Top In-Demand Technical Skills
            </h2>
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {trendingSkills.slice(0, 12).map((item, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{item.skill}</span>
                  <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        height: "100%",
                        background: "#2563eb",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b", textAlign: "right" }}>{item.count} jobs</span>
                </div>
              ))}
            </div>
          </section>

          {/* Skills by Category */}
          <section className="trending-section">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem" }}>
              Skills Categorization Breakdown
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
              {topCategories.map(
                (cat) =>
                  cat.skills.length > 0 && (
                    <div key={cat.category} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", textTransform: "capitalize", marginBottom: "0.75rem" }}>
                        {cat.category}
                      </h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {cat.skills.slice(0, 8).map((skill, idx) => (
                          <span key={idx} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "1px solid #bfdbfe" }}>
                            {skill.skill} ({skill.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  ),
              )}
            </div>
          </section>

          {/* Market Insights */}
          <section className="trending-section">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem" }}>
              Market Density Metrics
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "12px", textAlign: "center" }}>
                <p style={{ color: "#64748b", fontSize: "0.82rem", textTransform: "uppercase", fontWeight: 700, margin: "0 0 0.25rem" }}>Total Skills Tracked</p>
                <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>{trendingSkills.length}</p>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "12px", textAlign: "center" }}>
                <p style={{ color: "#64748b", fontSize: "0.82rem", textTransform: "uppercase", fontWeight: 700, margin: "0 0 0.25rem" }}>Most In-Demand</p>
                <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#2563eb", margin: 0 }}>{trendingSkills[0]?.skill || "Java"}</p>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.25rem", borderRadius: "12px", textAlign: "center" }}>
                <p style={{ color: "#64748b", fontSize: "0.82rem", textTransform: "uppercase", fontWeight: 700, margin: "0 0 0.25rem" }}>Top Skill Frequency</p>
                <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#166534", margin: 0 }}>{trendingSkills[0]?.percentage || 0}%</p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: "1rem" }}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <h3>No Skills Data Available</h3>
          <p>Search and load jobs to inspect market skill demand.</p>
        </div>
      )}
    </div>
  );
};

export default TrendingSkillsTab;
