import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuthState } from "../utils/auth";
import "../styles/auth.css";

const OAuthCallback = ({ provider }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the token/code from URL parameters
        const token = searchParams.get("token");
        const code = searchParams.get("code");

        console.debug(`[OAuthCallback] ${provider} callback:`, {
          token: !!token,
          code: !!code,
        });

        if (token) {
          // Backend provided a JWT token directly
          saveAuthState(token);
          console.debug(
            `[OAuthCallback] Token saved for ${provider}:`,
            localStorage.getItem("token") ? "present" : "missing",
          );
          navigate("/jobs");
        } else if (code) {
          // Exchange authorization code for token
          // In a real implementation, you would call your backend to exchange the code
          console.debug(
            `[OAuthCallback] Authorization code received for ${provider}:`,
            code,
          );

          // For now, show a message and redirect
          // TODO: Implement code exchange with backend
          alert(`${provider} login successful! Redirecting to jobs...`);
          navigate("/jobs");
        } else {
          throw new Error(
            `No token or authorization code received from ${provider}`,
          );
        }
      } catch (error) {
        console.error(`[OAuthCallback] ${provider} callback error:`, error);

        // Redirect back to login with error
        navigate("/login", {
          state: {
            error: `${provider} authentication failed: ${error.message}`,
          },
        });
      }
    };

    handleCallback();
  }, [searchParams, provider, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Authenticating...</h1>
        <p style={{ marginTop: "1rem", color: "#647199", fontSize: "1.05rem" }}>
          Please wait while we complete your {provider} login.
        </p>
        <div
          className="spinner"
          style={{ marginTop: "2rem", display: "block" }}
        />
      </div>
    </div>
  );
};

export default OAuthCallback;
