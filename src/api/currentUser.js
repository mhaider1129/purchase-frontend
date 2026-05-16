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

    // If the configured base already includes an "api" segment anywhere,
    // use the relative route to avoid duplicated "/api" prefixes.
    if (/(^|\/)api(\/|$)/i.test(normalizedPath)) {
      return "/users/me";
    }
  } catch {
    // Fall back to the safest route shape below.
  }

  return "/api/users/me";
};

const CURRENT_USER_ENDPOINT = resolveCurrentUserEndpoint();

const alternateCurrentUserEndpoint = (endpoint) => {
  if (endpoint === "/api/users/me") return "/users/me";
  if (endpoint === "/users/me") return "/api/users/me";
  return null;
};

export const fetchCurrentUser = async (config = {}) => {
  try {
    return await api.get(CURRENT_USER_ENDPOINT, config);
  } catch (err) {
    const status = err?.response?.status;
    const fallbackEndpoint = alternateCurrentUserEndpoint(CURRENT_USER_ENDPOINT);

    if (status !== 404 || !fallbackEndpoint) {
      throw err;
    }

    return api.get(fallbackEndpoint, config);
  }
};