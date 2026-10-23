// Centralized fetch wrapper. In dev, Vite proxies "/api" to the backend
// (see vite.config.js). In production, set VITE_API_URL to the deployed
// backend's URL (e.g. https://your-api.onrender.com) at build time.
const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "lm_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Can't reach the server. If it has been idle it may be waking up (up to a minute on the free tier) — try again shortly."
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  // An expired/revoked session: tell the app to sign out instead of leaving
  // the user on a page where every action fails.
  if (res.status === 401 && auth && getToken()) {
    window.dispatchEvent(new Event("auth:expired"));
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),

  // auth
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),
};

export { getToken, TOKEN_KEY };
