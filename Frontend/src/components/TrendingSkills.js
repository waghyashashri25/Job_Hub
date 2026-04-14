import React, { useMemo } from "react";
import { extractSkillsFromJob } from "../services/jobMatchingService";
import "../styles/dashboard.css";

const TrendingSkills = ({ jobs = [] }) => {
  const trendingSkills = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return [];
    }

    // Count skill occurrences across all jobs
    const skillCounts = {};

    jobs.forEach((job) => {
      const skills = extractSkillsFromJob(job.description);
      skills.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    // Convert to array and sort by count
    return Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skill,
        count,
        percentage: Math.round((count / jobs.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12); // Top 12 skills
  }, [jobs]);

  const maxCount = useMemo(() => {
    if (trendingSkills.length === 0) return 0;
    return Math.max(...trendingSkills.map((s) => s.count));
  }, [trendingSkills]);

  if (!jobs || jobs.length === 0) {
    return null;
  }

  return (
    <section className="trending-skills-section">
      <div className="dashboard-section-header">
        <h2>Trending Skills 📈</h2>
        <p className="section-subtitle">Top skills in {jobs.length} jobs</p>
      </div>

      <div className="trending-skills-grid">
        {trendingSkills.map((item, index) => (
          <div key={index} className="skill-card">
            <div className="skill-name">{item.skill}</div>
            <div className="skill-bar-container">
              <div
                className="skill-bar"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: `hsl(${(index * 30) % 360}, 70%, 55%)`,
                }}
              />
            </div>
            <div className="skill-stats">
              <span className="count">{item.count}</span>
              <span className="percentage">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingSkills;
