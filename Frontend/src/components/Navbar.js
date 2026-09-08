import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getRole, getUserEmail } from "../utils/auth";
import { adminService } from "../services/apiService";
import "../styles/navbar.css";

const Navbar = ({ onOpenProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = getRole();
  const userEmail = getUserEmail();
  const token =
    localStorage.getItem("token") || localStorage.getItem("jwtToken");

  const [avatarPhoto, setAvatarPhoto] = useState(
    () => localStorage.getItem("jobhub_user_avatar") || null
  );
  const [announcement, setAnnouncement] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Fetch active site-wide announcement
  useEffect(() => {
    adminService
      .getAnnouncement()
      .then((res) => {
        if (res.data?.announcement && res.data.announcement.trim().length > 0) {
          setAnnouncement(res.data.announcement.trim());
        }
      })
      .catch(() => {});
  }, []);

  // Listen for avatar updates across the app
  useEffect(() => {
    const handleAvatarChange = () => {
      setAvatarPhoto(localStorage.getItem("jobhub_user_avatar"));
    };
    window.addEventListener("jobhub_avatar_updated", handleAvatarChange);
    return () => window.removeEventListener("jobhub_avatar_updated", handleAvatarChange);
  }, []);

  if (!token) return null;

  const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : "WA";

  const handleProfileClick = () => {
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      navigate("/jobs?tab=profile");
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab");

  const isApplicationsActive =
    location.pathname === "/applications" ||
    (location.pathname === "/jobs" && currentTab === "applications");

  const isPlatformsActive =
    location.pathname === "/jobs" && currentTab === "platforms";

  const isRecommendedActive =
    location.pathname === "/jobs" && currentTab === "recommended";

  const isTrendingActive =
    location.pathname === "/jobs" && currentTab === "trending";

  const isInsightsActive =
    location.pathname === "/jobs" && currentTab === "insights";

  const isCareerActive =
    location.pathname === "/jobs" && currentTab === "career";

  const isDashboardActive =
    location.pathname === "/jobs" &&
    !isApplicationsActive &&
    !isPlatformsActive &&
    !isRecommendedActive &&
    !isTrendingActive &&
    !isInsightsActive &&
    !isCareerActive &&
    currentTab !== "profile";

  return (
    <>
      {announcement && !bannerDismissed && (
        <div className="global-announcement-bar">
          <div className="announcement-content">
            <span className="announcement-badge">ANNOUNCEMENT</span>
            <span>{announcement}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="announcement-close-btn"
            title="Dismiss announcement"
          >
            ✕
          </button>
        </div>
      )}
      <nav className="navbar">
      <div className="navbar-inner">
        {/* Left Side: Brand Logo */}
        <Link to="/jobs" className="navbar-brand">
          <img src="/logo.png" alt="JobHub Logo" className="navbar-logo-img" />
          <div className="navbar-brand-text-block">
            <span className="navbar-brand-title">JobHub</span>
            <span className="navbar-brand-badge">AI Powered Job Hunt Platform</span>
          </div>
        </Link>

        {/* Right Side: Platforms, Recommended, Trending Skills, AI Insights, AI Career Intelligence, Applications, Dashboard, Admin Console, Avatar */}
        <div className="navbar-right">
          <Link
            to="/jobs?tab=platforms"
            className={`nav-link ${isPlatformsActive ? "active" : ""}`}
          >
            Platforms
          </Link>
          <Link
            to="/jobs?tab=recommended"
            className={`nav-link ${isRecommendedActive ? "active" : ""}`}
          >
            Recommended
          </Link>
          <Link
            to="/jobs?tab=trending"
            className={`nav-link ${isTrendingActive ? "active" : ""}`}
          >
            Trending Skills
          </Link>
          <Link
            to="/jobs?tab=insights"
            className={`nav-link ${isInsightsActive ? "active" : ""}`}
          >
            AI Insights
          </Link>
          <Link
            to="/jobs?tab=career"
            className={`nav-link ${isCareerActive ? "active" : ""}`}
          >
            AI Career Intelligence
          </Link>
          <Link
            to="/jobs?tab=applications"
            className={`nav-link ${isApplicationsActive ? "active" : ""}`}
          >
            Applications
          </Link>
          <Link
            to="/jobs?tab=jobs"
            className={`nav-link ${isDashboardActive ? "active" : ""}`}
          >
            Dashboard
          </Link>

          {(userRole === "RECRUITER" || userRole === "ADMIN") && (
            <NavLink
              to="/recruiter"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                borderRadius: "8px",
                padding: "0.4rem 0.75rem",
                fontWeight: 700,
              }}
            >
              💼 Recruiter Portal
            </NavLink>
          )}

          {userRole === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              Admin Console
            </NavLink>
          )}

          {/* Single Circular Avatar Button for Profile & Live Resume Watch */}
          <button
            onClick={handleProfileClick}
            className="btn-profile-nav"
            type="button"
            title="Personalised Profile & Live Resume Watch"
          >
            {avatarPhoto ? (
              <img src={avatarPhoto} alt="User Avatar" className="nav-avatar-img" />
            ) : (
              <span>{initials}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Navbar;
