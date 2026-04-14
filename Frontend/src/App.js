import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { isAuthenticated, getRole } from "./utils/auth";
import { ProtectedRoute, AdminRoute } from "./utils/ProtectedRoute";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ApplicationTracker from "./pages/ApplicationTracker";
import AdminPanel from "./pages/AdminPanel";
import OAuthCallback from "./pages/OAuthCallback";

import "./styles/global.css";

function App() {
  const userRole = getRole();

  return (
    <Router>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/auth/google/callback"
              element={<OAuthCallback provider="Google" />}
            />
            <Route
              path="/auth/github/callback"
              element={<OAuthCallback provider="GitHub" />}
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute
                  element={<Dashboard />}
                  allowedRoles={["USER", "ADMIN"]}
                />
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute
                  element={<ApplicationTracker />}
                  allowedRoles={["USER", "ADMIN"]}
                />
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  element={
                    <AdminRoute element={<AdminPanel />} userRole={userRole} />
                  }
                />
              }
            />
            <Route
              path="/"
              element={
                isAuthenticated() ? (
                  <Navigate to="/jobs" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
