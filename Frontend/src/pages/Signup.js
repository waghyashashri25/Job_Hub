import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/apiService";
import { saveAuthState } from "../utils/auth";
import CountryPhoneInput from "../components/CountryPhoneInput";
import OtpModal from "../components/OtpModal";
import PopupModal from "../components/PopupModal";
import "../styles/auth.css";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("USER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  // OTP Modal State
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Popup Modal State (for duplicates or wrong inputs)
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

  // Real-time password validation criteria
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial;

  const fullPhoneNumber = phone.trim() ? `${countryCode}${phone.trim()}` : "";

  // Pre-flight check & send OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 1. Validate password strength
    if (!isPasswordValid) {
      setPopup({
        isOpen: true,
        title: "Weak Password",
        message: "Your password must be at least 8 characters long and include at least one number (0-9) and one special symbol (!@#$%^&*...).",
        type: "warning",
        primaryBtnText: "Update Password",
        onPrimary: () => setPopup((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    // 2. Validate phone length if entered
    if (phone.trim() && phone.trim().length < 7) {
      setError("Please enter a valid phone number according to your selected nation.");
      return;
    }

    setLoading(true);

    try {
      // 3. Check for duplicates
      const dupRes = await authService.checkDuplicate(email, fullPhoneNumber);
      if (dupRes.data?.exists) {
        setPopup({
          isOpen: true,
          title: "User Already Exists",
          message: dupRes.data.message || "An account with this email address or phone number is already registered.",
          type: "error",
          primaryBtnText: "Go to Sign In",
          onPrimary: () => {
            setPopup((prev) => ({ ...prev, isOpen: false }));
            navigate("/login");
          },
          secondaryBtnText: "Try Another Email",
          onSecondary: () => setPopup((prev) => ({ ...prev, isOpen: false })),
        });
        setLoading(false);
        return;
      }

      // 4. Dispatch real OTP to mobile phone and email
      await authService.sendOtp(email, "REGISTRATION", name, fullPhoneNumber);

      // 5. Open OTP modal
      setOtpError("");
      setIsOtpOpen(true);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Could not initiate registration. Please check your information.";
      setError(typeof errorMsg === "string" ? errorMsg : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and complete signup
  const handleVerifyOtp = async (otpCode) => {
    setOtpLoading(true);
    setOtpError("");

    try {
      // 1. Verify OTP code against email or phone
      await authService.verifyOtp(email, "REGISTRATION", otpCode, fullPhoneNumber);

      // 2. Register user
      await authService.signup(name, email, password, fullPhoneNumber, countryCode, role);

      setIsOtpOpen(false);
      setSuccess("Mobile number & email verified! Account created successfully. Welcome to JobHub.");

      // 3. Auto-login
      try {
        const loginRes = await authService.login(email, password);
        const token =
          typeof loginRes.data === "string"
            ? loginRes.data
            : loginRes.data?.token;
        if (token) {
          saveAuthState(token);
          setPopup({
            isOpen: true,
            title: "Registration Complete!",
            message: "Your account is activated and a confirmation email has been sent to " + email + ". Taking you to your dashboard...",
            type: "success",
            primaryBtnText: "Go to Jobs",
            onPrimary: () => {
              setPopup((prev) => ({ ...prev, isOpen: false }));
              navigate("/jobs");
            },
          });
          setTimeout(() => navigate("/jobs"), 1500);
          return;
        }
      } catch (autoErr) {
        console.warn("Auto-login note:", autoErr);
      }

      setTimeout(() => navigate("/login"), 1200);
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

  const handleResendOtp = async () => {
    try {
      await authService.sendOtp(email, "REGISTRATION", name, fullPhoneNumber);
      setOtpError("");
    } catch (err) {
      setOtpError("Failed to resend code. Please try again.");
    }
  };

  const handleOAuthSignup = (provider) => {
    setError("");
    setSocialLoading(provider);
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
    window.location.href = `${apiUrl}/oauth/${provider.toLowerCase()}`;
  };

  return (
    <div className="auth-page">
      {/* Dynamic Popups for User Exists / Validation */}
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

      {/* Real 6-Digit OTP Verification Modal */}
      <OtpModal
        isOpen={isOtpOpen}
        title="Verify Your Email & Phone"
        subtitle={
          <>
            We sent a real 6-digit verification code to <strong>{email}</strong>
            {phone && <> and <strong>{countryCode} {phone}</strong></>}.
          </>
        }
        destination={email}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onClose={() => setIsOtpOpen(false)}
        loading={otpLoading}
        error={otpError}
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
          <span className="auth-kicker">Create account</span>
          <h1>Join JobHub</h1>
          <p className="auth-subtitle">
            Discover opportunities from 10+ verified platforms and track applications in real-time.
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

        {success && (
          <div className="ui-alert success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Account Type Selector */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.4rem" }}>
              Join JobHub as:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => setRole("USER")}
                style={{
                  padding: "0.6rem 0.5rem",
                  borderRadius: "10px",
                  border: role === "USER" ? "2px solid #2563eb" : "1.5px solid #cbd5e1",
                  background: role === "USER" ? "#eff6ff" : "#ffffff",
                  color: role === "USER" ? "#1d4ed8" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
              >
                👤 Job Seeker
              </button>
              <button
                type="button"
                onClick={() => setRole("RECRUITER")}
                style={{
                  padding: "0.6rem 0.5rem",
                  borderRadius: "10px",
                  border: role === "RECRUITER" ? "2px solid #10b981" : "1.5px solid #cbd5e1",
                  background: role === "RECRUITER" ? "#f0fdf4" : "#ffffff",
                  color: role === "RECRUITER" ? "#047857" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
              >
                💼 Employer
              </button>
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="signup-name">Full name</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="signup-email">Email address</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* International Country Phone Input */}
          <div className="auth-input-group">
            <label htmlFor="signup-phone">Phone number</label>
            <CountryPhoneInput
              id="signup-phone"
              countryCode={countryCode}
              onCountryChange={setCountryCode}
              phone={phone}
              onPhoneChange={setPhone}
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                autoComplete="new-password"
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

          {/* Real-time Password Requirements Checklist */}
          <div className="password-checklist">
            <div className={`check-item ${hasMinLength ? "valid" : ""}`}>
              <span className="check-icon">{hasMinLength ? "✓" : "•"}</span>
              <span>Minimum 8 characters</span>
            </div>
            <div className={`check-item ${hasNumber ? "valid" : ""}`}>
              <span className="check-icon">{hasNumber ? "✓" : "•"}</span>
              <span>At least one number (0-9)</span>
            </div>
            <div className={`check-item ${hasSpecial ? "valid" : ""}`}>
              <span className="check-icon">{hasSpecial ? "✓" : "•"}</span>
              <span>At least one special symbol (!@#$%^&*...)</span>
            </div>
          </div>

          <button type="submit" className="btn-auth" disabled={loading || !!socialLoading}>
            {loading ? (
              <>
                <div className="spinner" />
                <span>Checking details...</span>
              </>
            ) : (
              "Verify Mobile & Register"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or sign up with</span>
        </div>

        {/* Social Signups */}
        <div className="auth-social-stack">
          <button
            type="button"
            className="btn-google"
            onClick={() => handleOAuthSignup("GOOGLE")}
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
            <span>Sign up with Google</span>
          </button>

          <button
            type="button"
            className="btn-github"
            onClick={() => handleOAuthSignup("GITHUB")}
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
            <span>Sign up with GitHub</span>
          </button>
        </div>

        {/* Login Link */}
        <p className="auth-link-text">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
