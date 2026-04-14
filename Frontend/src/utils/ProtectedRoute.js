import React from "react";
import { Navigate } from "react-router-dom";
import { getRole, isAuthenticated } from "./auth";

export const ProtectedRoute = ({ element, allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = getRole();
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/jobs" replace />;
    }
  }

  return element;
};

export const AdminRoute = ({ element, userRole }) => {
  return userRole === "ADMIN" ? element : <Navigate to="/jobs" replace />;
};
