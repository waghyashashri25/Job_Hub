import React, { useEffect } from "react";
import "../styles/auth.css";

const PopupModal = ({
  isOpen,
  title,
  message,
  type = "info", // "error" | "warning" | "success" | "info"
  primaryBtnText = "Got it",
  onPrimary,
  secondaryBtnText,
  onSecondary,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case "error":
        return (
          <div className="popup-icon-badge popup-error">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="popup-icon-badge popup-warning">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        );
      case "success":
        return (
          <div className="popup-icon-badge popup-success">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="popup-icon-badge popup-info">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        {renderIcon()}
        <h3 className="popup-title">{title}</h3>
        <p className="popup-message">{message}</p>

        <div className="popup-actions">
          {secondaryBtnText && (
            <button
              type="button"
              className="popup-btn popup-btn-secondary"
              onClick={onSecondary || onClose}
            >
              {secondaryBtnText}
            </button>
          )}
          <button
            type="button"
            className={`popup-btn popup-btn-${type}`}
            onClick={onPrimary || onClose}
          >
            {primaryBtnText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupModal;
