import React, { useState } from "react";
import { jobService } from "../services/apiService";
import "../styles/admin.css";

const AdminPanel = () => {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const job = {
        title,
        company,
        location,
        description,
        source,
        applyLink,
        postedTime: new Date().toISOString(),
      };

      await jobService.createJob(job);
      setMessage("Job created successfully!");
      setTitle("");
      setCompany("");
      setLocation("");
      setDescription("");
      setSource("");
      setApplyLink("");
    } catch (err) {
      setError(err.response?.data || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  const handleAggregate = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await jobService.aggregateJobs(
        keyword || null,
        searchLocation || null,
      );
      setMessage(`Aggregation completed: ${response.data}`);
    } catch (err) {
      setError(err.response?.data || "Failed to trigger aggregation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-page">
      <header className="admin-header">
        <p className="page-kicker">Admin controls</p>
        <h1>Job Operations Dashboard</h1>
      </header>

      {message && <div className="ui-alert success">{message}</div>}
      {error && <div className="ui-alert error">{error}</div>}

      <div className="admin-grid">
        <section className="admin-card glass">
          <h3>Create New Job</h3>
          <form onSubmit={handleCreateJob} className="admin-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Source (Platform)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Apply Link</label>
              <input
                type="url"
                value={applyLink}
                onChange={(e) => setApplyLink(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Job"}
            </button>
          </form>
        </section>

        <section className="admin-card glass">
          <h3>Trigger Job Aggregation</h3>
          <p>Fetch jobs from all configured platforms and deduplicate.</p>
          <div className="form-group">
            <label>Keyword (optional)</label>
            <input
              type="text"
              placeholder="e.g., Python, Java"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Location (optional)</label>
            <input
              type="text"
              placeholder="e.g., Remote, Bangalore"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
            />
          </div>
          <button onClick={handleAggregate} disabled={loading}>
            {loading ? "Aggregating..." : "Start Aggregation"}
          </button>
        </section>
      </div>
    </section>
  );
};

export default AdminPanel;
