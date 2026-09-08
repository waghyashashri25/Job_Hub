import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { saveAuthState, getUserEmail } from "../utils/auth";
import "../styles/auth.css";

const OAuthCallback = ({ provider = "Google" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let isMounted = true;

    const processAuth = () => {
      try {
        const token = searchParams.get("token");
        const error = searchParams.get("error");
        const name = searchParams.get("name");
        const email = searchParams.get("email");
        const roleParam = searchParams.get("role");

        if (error) {
          throw new Error(decodeURIComponent(error));
        }

        if (token) {
          const decodedRole = roleParam ? decodeURIComponent(roleParam).toUpperCase() : null;
          saveAuthState(token, decodedRole);
          window.dispatchEvent(new Event("jobhub_role_updated"));
          
          const decodedName = name ? decodeURIComponent(name) : "";
          const decodedEmail = email ? decodeURIComponent(email) : (getUserEmail() || "");
          
          if (isMounted) {
            if (decodedName) setDisplayName(decodedName);
            if (decodedEmail) setUserEmail(decodedEmail);
            setStatus("success");
          }
          return;
        }

        throw new Error("No authorization token was received. Please try signing in again.");
      } catch (err) {
        console.error(`[OAuthCallback] ${provider} error:`, err);
        if (isMounted) {
          setStatus("error");
          setErrorMessage(err.message || "Authentication failed.");
        }
      }
    };

    processAuth();

    return () => {
      isMounted = false;
    };
  }, [searchParams, provider]);

  // Handle countdown and smooth auto-redirect on success
  useEffect(() => {
    if (status !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/jobs", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  const detectedProvider = (searchParams.get("provider") || provider).toLowerCase();
  const isGoogle = detectedProvider === "google";
  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "JH";

  return (
    <div className="auth-page">
      <div className="auth-card oauth-callback-card">
        {/* Top Header with Brand and Verified Provider Badge */}
        <div className="oauth-top-bar">
          <div className="oauth-brand-pill">
            <img src="/logo.png" alt="JobHub" className="oauth-brand-icon" />
            <span className="oauth-brand-name">JobHub</span>
          </div>
          <div className={`oauth-provider-tag ${isGoogle ? "google" : "github"}`}>
            {isGoogle ? (
              <>
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M17.64 9.204c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Google Verified</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>GitHub Verified</span>
              </>
            )}
          </div>
        </div>

        {/* VERIFYING STATE */}
        {status === "verifying" && (
          <div className="oauth-content-block">
            <div className="oauth-hero-spinner">
              <div className="spinner-orbit" />
              <div className="spinner-core" />
            </div>
            <h1 className="oauth-main-title">Verifying Identity</h1>
            <p className="oauth-main-subtitle">
              Securely validating credentials with{" "}
              <strong>{isGoogle ? "Google Cloud Identity" : "GitHub Security"}</strong>...
            </p>
            <div className="oauth-meter-track">
              <div className="oauth-meter-fill-animated" />
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === "success" && (
          <div className="oauth-content-block">
            {/* Animated Success Checkmark Ring */}
            <div className="oauth-success-badge-wrap">
              <div className="oauth-success-pulse-ring" />
              <div className="oauth-success-icon-box">
                <svg
                  className="oauth-success-check-svg"
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h1 className="oauth-main-title">Authentication Successful!</h1>
            <p className="oauth-main-subtitle">
              Welcome back{displayName ? `, ${displayName}` : ""}. Your session has been securely established.
            </p>

            {/* Profile Identity Card */}
            <div className="oauth-identity-card">
              <div className="oauth-identity-avatar">
                <span>{userInitials}</span>
              </div>
              <div className="oauth-identity-details">
                <div className="oauth-identity-name-row">
                  <span className="oauth-identity-name">{displayName || "Job Seeker"}</span>
                  <span className="oauth-status-badge">
                    <span className="status-dot-active" /> Active
                  </span>
                </div>
                <div className="oauth-identity-email">{userEmail || "Authenticated Member"}</div>
              </div>
            </div>

            {/* Redirection Progress Indicator */}
            <div className="oauth-redirect-box">
              <div className="oauth-redirect-header">
                <span className="oauth-redirect-label">
                  <span className="spinner-mini" /> Entering Career Dashboard
                </span>
                <span className="oauth-redirect-timer">{countdown}s</span>
              </div>
              <div className="oauth-meter-track">
                <div
                  className="oauth-meter-fill"
                  style={{
                    width: `${((4 - countdown) / 3) * 100}%`,
                    transition: "width 1s linear",
                  }}
                />
              </div>
            </div>

            {/* Manual Action Button */}
            <button
              type="button"
              className="btn-auth btn-oauth-proceed"
              onClick={() => navigate("/jobs", { replace: true })}
            >
              <span>Go to Dashboard Now</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {/* Security Guarantee Micro Badges */}
            <div className="oauth-security-footer">
              <span className="oauth-sec-pill">🔒 256-bit TLS Encrypted</span>
              <span className="oauth-sec-pill">🛡️ OAuth 2.0 Certified</span>
              <span className="oauth-sec-pill">⚡ Instant Job Sync</span>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === "error" && (
          <div className="oauth-content-block">
            <div className="oauth-error-icon-box">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1 className="oauth-main-title error-title">Authentication Failed</h1>
            <p className="oauth-main-subtitle">
              We were unable to complete your sign-in via {isGoogle ? "Google" : "GitHub"}.
            </p>

            <div className="oauth-error-callout">
              <span className="oauth-error-callout-icon">⚠️</span>
              <div className="oauth-error-callout-text">{errorMessage}</div>
            </div>

            <p className="oauth-error-hint">
              This usually occurs if you cancelled the prompt, closed the window early, or your account isn't authorized.
            </p>

            <Link to="/login" className="btn-auth btn-oauth-proceed" style={{ textDecoration: "none", marginTop: "1rem" }}>
              <span>Return to Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
