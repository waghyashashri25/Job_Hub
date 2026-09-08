import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("jwtToken");
    const requestUrl = `${config.baseURL || ""}${config.url || ""}`;

    console.debug("[API Request] URL:", requestUrl);
    console.debug(
      "[API Request] token from localStorage:",
      token ? "present" : "missing",
    );

    const isPublicAuthEndpoint =
      config.url?.includes("/users/signup") ||
      config.url?.includes("/users/check-duplicate") ||
      config.url?.includes("/users/send-otp") ||
      config.url?.includes("/users/verify-otp") ||
      config.url?.includes("/users/login") ||
      config.url?.includes("/users/forgot-password");

    if (token && !isPublicAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
      console.debug("[API Request] Authorization header set with Bearer token");
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = window.location.pathname.includes("/login") || window.location.pathname.includes("/signup");

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired. Please login again."));
    }

    const serverMsg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (typeof error.response?.data === "string" ? error.response.data : null);

    if (error.response?.status === 403) {
      return Promise.reject(
        new Error(serverMsg || "You are not allowed to perform this action."),
      );
    }

    const message =
      serverMsg ||
      error.message ||
      "Unexpected error occurred.";

    return Promise.reject(new Error(message));
  },
);

export default axiosInstance;
