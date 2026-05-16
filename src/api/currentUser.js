import api from "./axios";

const USER_PROFILE_ENDPOINTS = ["/users/me", "/api/users/me"];

const isNotFound = (error) => error?.response?.status === 404;

export const fetchCurrentUser = async (config = {}) => {
  let lastError = null;

  for (const endpoint of USER_PROFILE_ENDPOINTS) {
    try {
      return await api.get(endpoint, config);
    } catch (error) {
      lastError = error;
      if (!isNotFound(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};