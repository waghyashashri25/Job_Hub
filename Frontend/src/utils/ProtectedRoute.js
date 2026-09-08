import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getRole, isAuthenticated, getToken } from "./auth";
import { authService } from "../services/apiService";

export const ProtectedRoute = ({ element, allowedRoles }) => {
  const initialRole = getRole();
  const [currentRole, setCurrentRole] = useState(initialRole);
  const needsVerification =
    isAuthenticated() &&
    allowedRoles &&
    allowedRoles.length > 0 &&
    (!initialRole || !allowedRoles.includes(initialRole));
  const [verifying, setVerifying] = useState(needsVerification);

  useEffect(() => {
    if (needsVerification && getToken()) {
      authService
        .getProfile()
        .then((res) => {
          if (res.data?.role) {
            const freshRole = String(res.data.role).toUpperCase();
            localStorage.setItem("userRole", freshRole);
            setCurrentRole(freshRole);
            window.dispatchEvent(new Event("jobhub_role_updated"));
          }
        })
        .catch(() => {})
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [needsVerification]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (verifying) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "#64748b" }}>
        <span>Verifying permissions...</span>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = currentRole || getRole();
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/jobs" replace />;
    }
  }

  return element;
};

export const AdminRoute = ({ element, userRole }) => {
  const role = getRole() || userRole;
  return role === "ADMIN" ? element : <Navigate to="/jobs" replace />;
};
