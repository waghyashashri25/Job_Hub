import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logout, getRole } from "../utils/auth";
import "../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const userRole = getRole();
  const token =
    localStorage.getItem("token") || localStorage.getItem("jwtToken");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!token) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/jobs" className="navbar-brand">
          JobHub
        </Link>

        <div className="navbar-menu">
          <NavLink
            to="/jobs"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Jobs
          </NavLink>
          <NavLink
            to="/applications"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Applications
          </NavLink>
          {userRole === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              Admin
            </NavLink>
          )}
          <button onClick={handleLogout} className="btn-logout" type="button">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
