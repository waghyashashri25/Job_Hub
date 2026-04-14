import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/apiService";
import { saveAuthState } from "../utils/auth";
import "../styles/auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      const token =
        typeof response.data === "string"
          ? response.data
          : response.data?.token;

      console.debug(
        "[Login] response token received:",
        token ? "present" : "missing",
      );

      if (!token) {
        throw new Error("Login response did not include a token");
      }

      saveAuthState(token);
      console.debug(
        "[Login] token stored in localStorage:",
        localStorage.getItem("token") ? "present" : "missing",
      );
      navigate("/jobs");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = (e) => {
    e.preventDefault();
    console.debug("[Login] Google Sign-In clicked");
    // Redirect to backend OAuth endpoint or Google OAuth
    const googleAuthUrl = `${process.env.REACT_APP_API_URL || "http://localhost:8080/api"}/oauth/google`;
    window.location.href = googleAuthUrl;
  };

  const handleGithubSignIn = (e) => {
    e.preventDefault();
    console.debug("[Login] GitHub Sign-In clicked");
    // Redirect to backend OAuth endpoint or GitHub OAuth
    const githubAuthUrl = `${process.env.REACT_APP_API_URL || "http://localhost:8080/api"}/oauth/github`;
    window.location.href = githubAuthUrl;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-kicker">Welcome back</p>
        <h1>Sign in to JobHub</h1>
        <p className="auth-subtitle">
          Track opportunities and manage your applications.
        </p>

        {error && <div className="ui-alert error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleSignIn}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.6 9.2c0-.8-.1-1.6-.4-2.3H9v4.3h4.8c-.2 1.3-.9 2.4-2 3.1v2.5h3.2c1.9-1.7 3-4.3 3-7.6z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.4 0 4.4-.8 5.9-2.2l-3.2-2.5c-.9.6-2 1-3.7 1-2.8 0-5.2-1.9-6-4.5H2.6v2.6C3.9 16.6 6.3 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3 12.8c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V6.2H2.6C1.9 7.6 1.6 9 1.6 9s0 1.4.4 2.8l2-1.5z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.5c1.6 0 3 .5 4.1 1.6l3.1-3.1C13.4.9 11.4 0 9 0 6.3 0 3.9 1.4 2.6 3.5L3 6c.8-2.6 3.2-4.5 6-4.5z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <button
          type="button"
          className="btn-github"
          onClick={handleGithubSignIn}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 0C4.03 0 0 4.13 0 9.23c0 4.08 2.58 7.55 6.15 8.77.45.08.62-.2.62-.44v-1.53c-2.5.55-3.03-1.21-3.03-1.21-.41-1.04-1-1.31-1-1.31-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.38 2.1.98 2.61.75.08-.58.32-1 .58-1.21-2.01-.23-4.13-1.01-4.13-4.48 0-.99.35-1.8.92-2.43-.09-.23-.4-1.17.09-2.43 0 0 .75-.24 2.46.93.71-.2 1.48-.3 2.23-.3s1.52.1 2.23.3c1.7-1.17 2.45-.93 2.45-.93.48 1.26.17 2.2.08 2.43.57.63.92 1.44.92 2.43 0 3.48-2.12 4.24-4.14 4.46.33.28.62.84.62 1.7v2.52c0 .24.16.52.62.44C15.4 16.78 18 13.31 18 9.23 18 4.13 13.97 0 9 0z"
              fill="#1B1F23"
            />
          </svg>
          Sign in with GitHub
        </button>

        <p className="auth-link-text">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
