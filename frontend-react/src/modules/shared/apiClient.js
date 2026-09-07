// Shared HTTP client for the Office Management, Accounts and Attendance
// modules.
//
// The upstream Elite Convention Hall app authenticated with an httpOnly session
// cookie (`credentials: "include"`). This project's Laravel backend uses
// the same bearer-token scheme as the booking system, so the token is kept
// in localStorage and attached here instead. Everything else — response
// envelopes, error messages, status codes — matches MME exactly, so the
// page components are unchanged.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const EMPLOYEE_TOKEN_KEY = "ech_employee_token_v1";
export const EMPLOYEE_STORAGE_KEY = "ech_current_employee_v1";
export const OFFICE_ADMIN_TOKEN_KEY = "ech_office_admin_token_v1";
export const OFFICE_ADMIN_STORAGE_KEY = "ech_office_admin_v1";

export function getEmployeeToken() {
  return localStorage.getItem(EMPLOYEE_TOKEN_KEY);
}

export function getOfficeAdminToken() {
  return localStorage.getItem(OFFICE_ADMIN_TOKEN_KEY);
}

function authHeader(scope) {
  const token = scope === "admin" ? getOfficeAdminToken() : getEmployeeToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Drop-in replacement for `fetch` that prepends the API base URL and
 * attaches the bearer token. Returns the raw Response, so callers that
 * inspect `res.ok` / `res.json()` themselves keep working unchanged.
 */
export function apiFetch(path, { scope = "employee", ...options } = {}) {
  const isFormData = options.body instanceof FormData;

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeader(scope),
      ...(options.headers || {}),
    },
  });
}

/**
 * @param {string} path      API path, e.g. "/office/employees/me"
 * @param {object} options   fetch options; `scope: "admin"` picks the admin token
 */
export async function apiRequest(path, { scope = "employee", ...options } = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      // Let the browser set the multipart boundary itself.
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeader(scope),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}.`);
  }

  return payload.data ?? payload;
}

/** Same as apiRequest but returns the raw envelope (some callers need `message`). */
export async function apiRequestRaw(path, { scope = "employee", ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeader(scope),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}.`);
  }

  return payload;
}

/** Uploaded files are served by the booking app's existing /uploads route. */
export function resolveUploadUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url;
}
