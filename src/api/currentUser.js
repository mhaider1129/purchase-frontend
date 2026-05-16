import api from "./axios";

const resolveCurrentUserEndpoint = () => {
  const baseURL = api?.defaults?.baseURL || "";

  if (!baseURL) {
    return "/api/users/me";
  }

  try {
    const pathname = /^https?:\/\//i.test(baseURL)
      ? new URL(baseURL).pathname
      : baseURL;

    const normalizedPath = pathname.replace(/\/+$/, "");
    if (normalizedPath === "/api" || normalizedPath.endsWith("/api")) {
      return "/users/me";
    }
  } catch {
    // Fall back to the safest route shape below.
  }

  return "/api/users/me";
};

const CURRENT_USER_ENDPOINT = resolveCurrentUserEndpoint();

export const fetchCurrentUser = async (config = {}) => {
  return api.get(CURRENT_USER_ENDPOINT, config);
};