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
      .slice(0, 24); // Top 24 skills
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
        <h1>Trending Skills Market</h1>
        <p className="subtitle">
          Most in-demand skills across {jobs.length} job listings
        </p>
      </div>

      {trendingSkills.length > 0 ? (
        <>
          {/* Overall Trending Skills */}
          <section className="trending-section">
            <h2>🔥 Top {Math.min(12, trendingSkills.length)} Skills</h2>
            <div className="skills-bar-chart">
              {trendingSkills.slice(0, 12).map((item, index) => (
                <div key={index} className="skill-bar-item">
                  <div className="skill-info">
                    <span className="skill-name">{item.skill}</span>
                    <span className="skill-count">{item.count} jobs</span>
                  </div>
                  <div className="skill-bar-container">
                    <div
                      className="skill-bar"
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: `hsl(${(index * 30) % 360}, 70%, 55%)`,
                      }}
                    />
                  </div>
                  <span className="skill-percentage">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* Skills by Category */}
          <section className="trending-section">
            <h2>📋 Skills by Category</h2>
            <div className="category-skills">
              {topCategories.map(
                (cat) =>
                  cat.skills.length > 0 && (
                    <div key={cat.category} className="category-card">
                      <h3 className="category-title">
                        {cat.category.charAt(0).toUpperCase() +
                          cat.category.slice(1)}
                      </h3>
                      <div className="category-tags">
                        {cat.skills.slice(0, 8).map((skill, idx) => (
                          <div key={idx} className="skill-tag">
                            <span className="tag-name">{skill.skill}</span>
                            <span className="tag-count">{skill.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
              )}
            </div>
          </section>

          {/* Market Insights */}
          <section className="trending-section">
            <h2>📊 Market Insights</h2>
            <div className="insights-grid">
              <div className="insight-card">
                <p className="insight-label">Total Skills Identified</p>
                <p className="insight-value">{trendingSkills.length}</p>
              </div>
              <div className="insight-card">
                <p className="insight-label">Most In-Demand</p>
                <p className="insight-value">{trendingSkills[0]?.skill}</p>
              </div>
              <div className="insight-card">
                <p className="insight-label">Avg Jobs per Skill</p>
                <p className="insight-value">
                  {Math.round(
                    trendingSkills.reduce((sum, s) => sum + s.count, 0) /
                      trendingSkills.length,
                  )}
                </p>
              </div>
              <div className="insight-card">
                <p className="insight-label">Top Skill Frequency</p>
                <p className="insight-value">
                  {trendingSkills[0]?.percentage}%
                </p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">
          <p className="empty-icon">📊</p>
          <h3>No Skills Data</h3>
          <p>Load some jobs to see trending skills</p>
        </div>
      )}
    </div>
  );
};

export default TrendingSkillsTab;
