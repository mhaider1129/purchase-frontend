// src/api/axios.js
import axios from "axios";

// ✅ Use REACT_APP_API_BASE (or legacy REACT_APP_API_BASE_URL) or fall back to current host
const envBase =
  process.env.REACT_APP_API_BASE ?? process.env.REACT_APP_API_BASE_URL ?? "";

// 🧼 Ensure there is no trailing slash so Axios handles paths predictably
const normalizedEnvBase = envBase.replace(/\/+$/, "");

const resolveBrowserBase = () => {
  if (typeof window === "undefined") {
    return { primary: "", fallback: "" };
  }

  const { protocol, hostname, origin } = window.location;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isIPAddress =
    /^(\d+\.){3}\d+$/.test(hostname) || hostname.includes(":");

if (localHosts.has(hostname) || hostname.endsWith(".local")) {
    const localBackend = `${protocol}//${hostname}:5000/api`;
    return { primary: localBackend, fallback: localBackend };
  }

  if (isIPAddress) {
    const directHostApi = `${protocol}//${hostname}:5000/api`;
    return { primary: directHostApi, fallback: directHostApi };
  }

  if (hostname.startsWith("api.")) {
    const apiHost = `${protocol}//${hostname}/api`;
    return { primary: apiHost, fallback: apiHost };
  }

  const sameOriginApi = `${origin}/api`;

  return { primary: sameOriginApi, fallback: sameOriginApi };
};

const { primary: browserPrimary } = resolveBrowserBase();

const API_BASE = normalizedEnvBase || browserPrimary;

const normalizeApiPath = (url) => {
  if (typeof url !== "string") return url;
  if (!API_BASE) return url;

  const basePath = (() => {
    try {
      if (/^https?:\/\//i.test(API_BASE)) {
        return new URL(API_BASE).pathname.replace(/\/+$/, "");
      }
      return API_BASE.replace(/\/+$/, "");
    } catch {
      return "";
    }
  })();

  if (basePath === "/api" && url.startsWith("/api/")) {
    return url.replace(/^\/api/, "");
  }

  return url;
};

const applySharedAxiosConfig = (client) => {
  client.defaults.baseURL = API_BASE;
  client.defaults.timeout = 15000;
  client.defaults.headers = {
    ...client.defaults.headers,
    "Content-Type": "application/json",
  };

  client.interceptors.request.use(
    (config) => {
      config.url = normalizeApiPath(config.url);

      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      console.error("🔴 Request Error:", error);
      return Promise.reject(error);
    },
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.warn("🔒 Unauthorized — Token may be expired");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }

      if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
        console.debug("⚠️ Request canceled:", error.message);
        return Promise.reject(error);
      }

      if (error.response) {
        console.error(
          `❌ ${error.response.status}: ${error.response.data.message}`,
        );
      } else {
        console.error("❌ Network or Server error:", error.message);
      }

      return Promise.reject(error);
    },
  );
};

// ✅ Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Apply same behavior to both the shared axios singleton and our scoped api instance.
applySharedAxiosConfig(axios);
applySharedAxiosConfig(api);

export default api;