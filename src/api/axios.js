// src/api/axios.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  window.location.origin;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("🔴 Request Error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      console.debug("⚠️ Request canceled:", error.message);
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      console.warn("🔒 Unauthorized — Token may be expired");
      localStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    if (error.response) {
      console.error(
        `❌ ${error.response.status}:`,
        error.response.data?.message || error.response.data
      );
    } else {
      console.error("❌ Network or Server error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;