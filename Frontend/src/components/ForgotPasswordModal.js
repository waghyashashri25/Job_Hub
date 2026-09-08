import React, { useState } from "react";
import CountryPhoneInput from "./CountryPhoneInput";
import { authService } from "../services/apiService";
import "../styles/auth.css";

const ForgotPasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = identifier, 2 = OTP, 3 = new password, 4 = success
  const [mode, setMode] = useState("email"); // "email" | "phone"
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetDestination, setTargetDestination] = useState("");

  if (!isOpen) return null;

  const getTargetIdentifier = () => {
    if (mode === "email") {
      return email.trim().toLowerCase();
    } else {
      return `${countryCode}${phone.trim()}`;
    }
  };

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial && passwordsMatch;

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    const identifier = getTargetIdentifier();

    if (mode === "phone" && phone.length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPasswordRequest(identifier);
      setTargetDestination(res.data?.destination || identifier);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "No account found with this email or phone number."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const identifier = getTargetIdentifier();
      await authService.verifyOtp(identifier, "FORGOT_PASSWORD", otpCode);
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Invalid or expired verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Please satisfy all password complexity criteria below.");
      return;
    }

    setLoading(true);
    try {
      const identifier = getTargetIdentifier();
      await authService.forgotPasswordReset(identifier, otpCode, newPassword);
      setStep(4);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="forgot-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button type="button" className="modal-close-btn" onClick={onClose}>
          &times;
        </button>

        {/* Brand Icon */}
        <div className="otp-header-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* STEP 1: Enter Email / Phone */}
        {step === 1 && (
          <>
            <h2 className="otp-modal-title">Reset Your Password</h2>
            <p className="otp-modal-subtitle">
              Choose how you would like to receive your 6-digit recovery code.
            </p>

            {error && (
              <div className="ui-alert error" style={{ marginBottom: "1rem" }}>
                <span>{error}</span>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="forgot-mode-toggle">
              <button
                type="button"
                className={`forgot-toggle-btn ${mode === "email" ? "active" : ""}`}
                onClick={() => { setMode("email"); setError(""); }}
              >
                Via Email
              </button>
              <button
                type="button"
                className={`forgot-toggle-btn ${mode === "phone" ? "active" : ""}`}
                onClick={() => { setMode("phone"); setError(""); }}
              >
                Via Phone SMS
              </button>
            </div>

            <form onSubmit={handleRequestOtp} className="auth-form" style={{ marginTop: "1rem" }}>
              {mode === "email" ? (
                <div className="auth-input-group">
                  <label htmlFor="forgot-email">Registered Email Address</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
              ) : (
                <div className="auth-input-group">
                  <label>Registered Phone Number</label>
                  <CountryPhoneInput
                    countryCode={countryCode}
                    onCountryChange={setCountryCode}
                    phone={phone}
                    onPhoneChange={setPhone}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  "Send Recovery Code"
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: Enter Verification Code */}
        {step === 2 && (
          <>
            <h2 className="otp-modal-title">Enter Verification Code</h2>
            <p className="otp-modal-subtitle">
              Enter the 6-digit code sent to <strong>{targetDestination}</strong>
            </p>

            {error && (
              <div className="ui-alert error" style={{ marginBottom: "1rem" }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="auth-input-group">
                <label htmlFor="forgot-otp">6-Digit Code</label>
                <div className="auth-input-wrapper">
                  <input
                    id="forgot-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    style={{ textAlign: "center", fontSize: "1.25rem", letterSpacing: "4px", fontWeight: "700" }}
                  />
                </div>
              </div>

              <button type="submit" className="btn-auth" disabled={loading || otpCode.length !== 6}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              <button
                type="button"
                className="btn-link-secondary"
                onClick={() => { setStep(1); setError(""); }}
                style={{ marginTop: "0.75rem", width: "100%", textAlign: "center" }}
              >
                &larr; Re-enter email or phone
              </button>
            </form>
          </>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 3 && (
          <>
            <h2 className="otp-modal-title">Create New Password</h2>
            <p className="otp-modal-subtitle">
              Set a strong, secure password to protect your JobHub account.
            </p>

            {error && (
              <div className="ui-alert error" style={{ marginBottom: "1rem" }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="auth-input-group">
                <label htmlFor="reset-new-pass">New Password</label>
                <div className="auth-input-wrapper">
                  <input
                    id="reset-new-pass"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 number, 1 symbol"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="reset-confirm-pass">Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <input
                    id="reset-confirm-pass"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                  />
                </div>
              </div>

              {/* Password Requirements Checklist */}
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
                {confirmPassword && (
                  <div className={`check-item ${passwordsMatch ? "valid" : ""}`}>
                    <span className="check-icon">{passwordsMatch ? "✓" : "•"}</span>
                    <span>Passwords match</span>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-auth" disabled={loading || !isPasswordValid}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 4: Success State */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div className="popup-icon-badge popup-success" style={{ margin: "0 auto 1rem auto" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="otp-modal-title">Password Reset Complete!</h2>
            <p className="otp-modal-subtitle" style={{ marginBottom: "1.5rem" }}>
              Your password has been securely updated. You can now sign in with your new credentials.
            </p>
            <button
              type="button"
              className="btn-auth"
              onClick={() => {
                onClose();
                if (onSuccess) onSuccess();
              }}
            >
              Sign In Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
