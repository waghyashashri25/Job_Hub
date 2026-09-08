import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/apiService";
import { saveAuthState } from "../utils/auth";
import OtpModal from "../components/OtpModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import PopupModal from "../components/PopupModal";
import "../styles/auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  // Login OTP state
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpDestination, setOtpDestination] = useState("");

  // Forgot password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Popup Modal state
  const [popup, setPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    primaryBtnText: "OK",
    onPrimary: null,
    secondaryBtnText: null,
    onSecondary: null,
  });

  const navigate = useNavigate();

  // Login Step 1: Initial check & trigger real OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authService.loginInit(email, password);

      if (res.data?.otpRequired) {
        setOtpDestination(res.data.email || email);
        setOtpError("");
        setIsOtpOpen(true);
      } else {
        // Fallback for direct token
        const token = typeof res.data === "string" ? res.data : res.data?.token;
        if (token) {
          saveAuthState(token);
          navigate("/jobs");
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid email or password. Please check your credentials.";

      // Display prompt popup
      setPopup({
        isOpen: true,
        title: "Invalid Credentials",
        message: typeof errorMsg === "string" ? errorMsg : "The username or password you entered is incorrect. Please try again or use Forgot Password.",
        type: "error",
        primaryBtnText: "Try Again",
        onPrimary: () => setPopup((prev) => ({ ...prev, isOpen: false })),
        secondaryBtnText: "Forgot Password?",
        onSecondary: () => {
          setPopup((prev) => ({ ...prev, isOpen: false }));
          setIsForgotOpen(true);
        },
      });

      setError(typeof errorMsg === "string" ? errorMsg : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Login Step 2: Verify OTP and save auth token
  const handleVerifyLoginOtp = async (otpCode) => {
    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await authService.loginVerify(email, otpCode);
      const token = res.data?.token;

      if (!token) {
        throw new Error("Invalid response from server.");
      }

      saveAuthState(token);
      setIsOtpOpen(false);

      setPopup({
        isOpen: true,
        title: "Welcome Back to JobHub!",
        message: "Sign-in verified successfully. A confirmation email has been dispatched to your inbox.",
        type: "success",
        primaryBtnText: "Go to Dashboard",
        onPrimary: () => {
          setPopup((prev) => ({ ...prev, isOpen: false }));
          navigate("/jobs");
        },
      });

      setTimeout(() => navigate("/jobs"), 1200);
    } catch (err) {
      setOtpError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid or expired verification code. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    try {
      await authService.loginInit(email, password);
      setOtpError("");
    } catch (err) {
      setOtpError("Failed to resend code. Please try again.");
    }
  };

  const handleOAuthLogin = (provider) => {
    setError("");
    setSocialLoading(provider);
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
    window.location.href = `${apiUrl}/oauth/${provider.toLowerCase()}`;
  };

  return (
    <div className="auth-page">
      {/* Alert Popups */}
      <PopupModal
        isOpen={popup.isOpen}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        primaryBtnText={popup.primaryBtnText}
        onPrimary={popup.onPrimary}
        secondaryBtnText={popup.secondaryBtnText}
        onSecondary={popup.onSecondary}
        onClose={() => setPopup((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Login OTP Modal */}
      <OtpModal
        isOpen={isOtpOpen}
        title="Sign-In Security Verification"
        subtitle={
          <>
            A real 6-digit verification code has been sent to <strong>{otpDestination}</strong>.
          </>
        }
        destination={otpDestination}
        onVerify={handleVerifyLoginOtp}
        onResend={handleResendLoginOtp}
        onClose={() => setIsOtpOpen(false)}
        loading={otpLoading}
        error={otpError}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onSuccess={() => {
          setIsForgotOpen(false);
          setPopup({
            isOpen: true,
            title: "Password Updated",
            message: "Your password was successfully updated. You can now sign in with your new password.",
            type: "success",
            primaryBtnText: "OK",
            onPrimary: () => setPopup((prev) => ({ ...prev, isOpen: false })),
          });
        }}
      />

      <div className="auth-card">
        {/* Brand Header */}
        <Link to="/" className="auth-brand-header">
          <img
            src="/logo.png"
            alt="JobHub Logo"
            className="auth-brand-logo"
          />
          <div className="auth-brand-info">
            <span className="auth-brand-title">JobHub</span>
            <span className="auth-brand-badge">AI Powered Job Hunt Platform</span>
          </div>
        </Link>

        <div>
          <span className="auth-kicker">Welcome back</span>
          <h1>Sign in to JobHub</h1>
          <p className="auth-subtitle">
            Track opportunities, generate matches & manage applications.
          </p>
        </div>

        {error && (
          <div className="ui-alert error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label htmlFor="login-email">Email address</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label htmlFor="login-password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                className="btn-link-secondary"
                onClick={() => {
                  setError("");
                  setIsForgotOpen(true);
                }}
                style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: "600" }}
              >
                Forgot password?
              </button>
            </div>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-auth" disabled={loading || !!socialLoading}>
            {loading ? (
              <>
                <div className="spinner" />
                <span>Checking credentials...</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* Social Logins */}
        <div className="auth-social-stack">
          <button
            type="button"
            className="btn-google"
            onClick={() => handleOAuthLogin("GOOGLE")}
            disabled={loading || !!socialLoading}
          >
            {socialLoading === "GOOGLE" ? (
              <div className="spinner" style={{ borderColor: "rgba(37,99,235,0.3)", borderTopColor: "#2563eb" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
            )}
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            className="btn-github"
            onClick={() => handleOAuthLogin("GITHUB")}
            disabled={loading || !!socialLoading}
          >
            {socialLoading === "GITHUB" ? (
              <div className="spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            )}
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Sign up Link */}
        <p className="auth-link-text">
          New to JobHub? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
