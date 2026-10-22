import axios from "axios";

import { API_BASE } from "./config";

const API = axios.create({
  baseURL: API_BASE,
});

// ---- session helpers ------------------------------------------------------

function readCurrentUser(): any | null {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

function writeTokens(accessToken: string, refreshToken?: string) {
  const user = readCurrentUser();
  if (!user) return;
  user.AccessToken = accessToken;
  if (refreshToken) user.RefreshToken = refreshToken;
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userSettings");
  // HashRouter route — a bare /Login path would 404 on the static host.
  if (!window.location.hash.startsWith("#/Login")) {
    window.location.href = "/#/Login";
  }
}

// Attach the access token to every request.
API.interceptors.request.use(
  (config) => {
    const user = readCurrentUser();
    if (user?.AccessToken) {
      config.headers.Authorization = `Bearer ${user.AccessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ---- refresh-on-401 ---------------------------------------------------------
// On a 401 we call POST /auth/refreshtoken once with the stored refresh token,
// save the rotated access/refresh pair, and replay the original request.
// Concurrent 401s share a single in-flight refresh. If the refresh fails (or
// there is no refresh token) the session is cleared and we go to /#/Login.

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const user = readCurrentUser();
  const refreshToken = user?.RefreshToken;
  if (!refreshToken) throw new Error("No refresh token stored");

  // Plain axios, not API: must not carry the stale Authorization header or
  // re-enter these interceptors.
  const res = await axios.post(`${API_BASE}/auth/refreshtoken`, {
    refreshToken,
  });
  // Backend responses are wrapped as { status, message, data }.
  const data = res.data?.data ?? res.data;
  if (!data?.accessToken) throw new Error("Refresh returned no access token");
  writeTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Never try to refresh a failed login/refresh call itself.
    const isAuthCall =
      original?.url?.includes("/auth/refreshtoken") ||
      original?.url?.includes("/users/login") ||
      original?.url?.includes("/users/callback");

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return API(original);
      } catch {
        // Only clear once — repeated 401s with no session shouldn't spam
        // storage events / redirects.
        if (readCurrentUser()) clearSession();
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export default API;
