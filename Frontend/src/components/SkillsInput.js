import React, { useState, useEffect } from "react";
import { userService } from "../services/apiService";
import "../styles/skills-input.css";

const SkillsInput = ({ onSkillsUpdated = null, compact = false }) => {
  const [skills, setSkills] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [experience, setExperience] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(!compact);

  // Load user skills on mount
  useEffect(() => {
    loadUserSkills();
  }, []);

  const loadUserSkills = async () => {
    try {
      const response = await userService.getSkills();
      const {
        skills: skillsArray,
        jobTitle: jt,
        experience: exp,
      } = response.data;
      setSkills(skillsArray.join(", "));
      setJobTitle(jt || "");
      setExperience(exp || 0);
    } catch (err) {
      console.log("No skills saved yet or error loading:", err);
      // Use default skills if none exist
      setSkills("Java, Spring Boot, React, MySQL, Git");
    }
  };

  const handleSave = async () => {
    if (!skills.trim()) {
      setError("Please enter at least one skill");
      return;
    }

    setIsLoading(true);
    setError("");
    setIsSaved(false);

    try {
      await userService.updateSkillsFromString(skills, jobTitle, experience);
      setIsSaved(true);

      // Notify parent component if callback provided
      if (onSkillsUpdated) {
        const skillsArray = skills.split(",").map((s) => s.trim());
        onSkillsUpdated(skillsArray);
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error("Error saving skills:", err);
      setError("Failed to save skills. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = (skill) => {
    const skillsArray = skills.split(",").map((s) => s.trim());
    if (!skillsArray.includes(skill)) {
      setSkills(skills + (skills ? ", " : "") + skill);
    }
  };

  const removeSkill = (skill) => {
    const skillsArray = skills.split(",").map((s) => s.trim());
    const filtered = skillsArray.filter(
      (s) => s.toLowerCase() !== skill.toLowerCase(),
    );
    setSkills(filtered.join(", "));
  };

  // Quick skill suggestions
  const suggestions = {
    frontend: ["React", "Vue", "Angular", "TypeScript", "JavaScript", "CSS"],
    backend: ["Java", "Spring Boot", "Python", "Node.js", "Django", "Express"],
    databases: ["MySQL", "PostgreSQL", "MongoDB", "Redis"],
    devops: ["Docker", "Kubernetes", "AWS", "Git", "Jenkins"],
  };

  const skillsArray = skills
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);

  if (compact && !showForm) {
    return (
      <div className="skills-compact-view">
        <div className="skills-preview">
          <strong>{skillsArray.length}</strong> skills set
          {skillsArray.length > 0 && (
            <span className="skills-preview-list">
              {skillsArray.slice(0, 3).join(", ")}
              {skillsArray.length > 3 && "..."}
            </span>
          )}
        </div>
        <button className="btn-edit-skills" onClick={() => setShowForm(true)}>
          Edit Skills
        </button>
      </div>
    );
  }

  return (
    <div className="skills-input-container">
      <div className="skills-header">
        <h3>Your Skills & Profile</h3>
        {compact && (
          <button
            className="btn-close"
            onClick={() => setShowForm(false)}
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {isSaved && (
        <div className="success-message">✓ Skills updated successfully!</div>
      )}

      {/* Job Title Input */}
      <div className="form-group">
        <label htmlFor="jobTitle">Job Title (Optional)</label>
        <input
          id="jobTitle"
          type="text"
          placeholder="e.g., Full Stack Developer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="form-input"
        />
      </div>

      {/* Experience Input */}
      <div className="form-group">
        <label htmlFor="experience">Years of Experience</label>
        <input
          id="experience"
          type="number"
          min="0"
          max="60"
          value={experience}
          onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
          className="form-input"
        />
      </div>

      {/* Skills Input */}
      <div className="form-group">
        <label htmlFor="skills">
          Your Skills <span className="required">*</span>
        </label>
        <textarea
          id="skills"
          placeholder="Enter skills separated by commas. Example: Java, Spring Boot, React, MySQL, Docker"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="form-textarea"
          rows="3"
        />
        <div className="help-text">
          Comma-separated skills will be used to match with job requirements
        </div>
      </div>

      {/* Current Skills Display */}
      {skillsArray.length > 0 && (
        <div className="current-skills">
          <div className="current-skills-header">Current Skills:</div>
          <div className="skills-tags">
            {skillsArray.map((skill) => (
              <span key={skill} className="skill-badge">
                {skill}
                <button
                  className="remove-skill"
                  onClick={() => removeSkill(skill)}
                  title={`Remove ${skill}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Suggestions */}
      <div className="suggestions-section">
        <div className="suggestions-header">Quick Add Suggestions:</div>
        {Object.entries(suggestions).map(([category, cats]) => (
          <div key={category} className="suggestion-category">
            <div className="category-name">{category}</div>
            <div className="suggestion-buttons">
              {cats.map((skill) => (
                <button
                  key={skill}
                  className={`suggestion-btn ${
                    skillsArray.includes(skill) ? "added" : ""
                  }`}
                  onClick={() => addSkill(skill)}
                  disabled={skillsArray.includes(skill)}
                  title={skillsArray.includes(skill) ? "Already added" : "Add"}
                >
                  {skillsArray.includes(skill) ? "✓ " : "+ "} {skill}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button
          className="btn-save-skills"
          onClick={handleSave}
          disabled={isLoading || !skills.trim()}
        >
          {isLoading ? "Saving..." : "Save Skills"}
        </button>
        {compact && (
          <button className="btn-cancel" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default SkillsInput;
