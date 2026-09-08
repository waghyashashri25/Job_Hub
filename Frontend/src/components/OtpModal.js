import React, { useState, useRef, useEffect } from "react";
import "../styles/auth.css";

const OtpModal = ({
  isOpen,
  title = "Verify Your Identity",
  subtitle,
  destination = "",
  onVerify,
  onResend,
  onClose,
  loading = false,
  error = "",
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(["", "", "", "", "", ""]);
      setTimer(60);
      setCanResend(false);
      // Auto-focus first input box
      setTimeout(() => {
        if (inputsRef.current[0]) {
          inputsRef.current[0].focus();
        }
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval = null;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    // Only accept numeric digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const focusIndex = Math.min(pastedData.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullCode = otp.join("");
    if (fullCode.length === 6) {
      onVerify(fullCode);
    }
  };

  const handleResendClick = () => {
    if (canResend && onResend) {
      setTimer(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      onResend();
      inputsRef.current[0]?.focus();
    }
  };

  const isComplete = otp.every((d) => d !== "");

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="otp-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        {onClose && (
          <button type="button" className="modal-close-btn" onClick={onClose} title="Close">
            &times;
          </button>
        )}

        {/* Shield Icon */}
        <div className="otp-header-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <h2 className="otp-modal-title">{title}</h2>
        <p className="otp-modal-subtitle">
          {subtitle || (
            <>
              Enter the 6-digit verification code sent to{" "}
              <strong>{destination || "your email/phone"}</strong>
            </>
          )}
        </p>

        {error && (
          <div className="ui-alert error" style={{ marginBottom: "1.25rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Segmented 6-digit Inputs */}
          <div className="otp-inputs-row" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`otp-digit-box ${digit ? "filled" : ""}`}
                autoComplete="one-time-code"
                disabled={loading}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn-auth otp-submit-btn"
            disabled={!isComplete || loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Verifying...</span>
              </>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        {/* Resend Timer */}
        <div className="otp-resend-wrapper">
          {canResend ? (
            <button
              type="button"
              className="otp-resend-btn"
              onClick={handleResendClick}
              disabled={loading}
            >
              Resend verification code
            </button>
          ) : (
            <span className="otp-timer-text">
              Resend code in <strong>{timer}s</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpModal;
