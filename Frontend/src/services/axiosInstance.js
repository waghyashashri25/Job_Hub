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

    if (token) {
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
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired. Please login again."));
    }

    if (error.response?.status === 403) {
      return Promise.reject(
        new Error("You are not allowed to perform this action."),
      );
    }

    const message =
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      "Unexpected error occurred.";

    return Promise.reject(new Error(message));
  },
);

export default axiosInstance;
