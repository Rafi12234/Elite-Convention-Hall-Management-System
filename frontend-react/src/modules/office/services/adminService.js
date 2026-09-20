import {
  apiFetch,
  OFFICE_ADMIN_STORAGE_KEY,
  OFFICE_ADMIN_TOKEN_KEY,
} from "../../shared/apiClient";

// ─── In-memory session cache ────────────────────────────────────────────────
// Every admin page calls fetchAdminMe() on mount to guard the route. Without a
// cache each navigation fires a network request to /auth/me. Even with a
// generous throttle limit (120/min) clicking through several pages quickly can
// exhaust the quota → 429 → null → redirect to login. The cache makes only the
// FIRST mount hit the network; all subsequent mounts within the TTL window are
// answered instantly from memory. The cache is invalidated on logout and
// whenever the server rejects the token (expired / revoked).
let _adminCache = null;          // { admin, validatedAt }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function _setCached(admin) {
  _adminCache = { admin, validatedAt: Date.now() };
}
function _clearCache() {
  _adminCache = null;
}
function _getCached() {
  if (!_adminCache) return null;
  if (Date.now() - _adminCache.validatedAt > CACHE_TTL_MS) {
    _adminCache = null; // expired
    return null;
  }
  return _adminCache.admin;
}

export function loadCurrentAdmin() {
  try {
    const raw = localStorage.getItem(OFFICE_ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function adminLogin(email, password) {
  const res = await apiFetch(`/office/admin/auth/login`, { scope: "admin",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Login failed.");

  const { token, ...admin } = body.data;
  if (token) localStorage.setItem(OFFICE_ADMIN_TOKEN_KEY, token);
  localStorage.setItem(OFFICE_ADMIN_STORAGE_KEY, JSON.stringify(admin));

  // Populate the cache immediately so the first protected-route mount after
  // login is also served from memory without an extra /me round-trip.
  _setCached(admin);

  return admin;
}

export async function fetchAdminMe() {
  // Fast path 1: no token → definitely no session, skip the network call.
  const token = localStorage.getItem(OFFICE_ADMIN_TOKEN_KEY);
  if (!token) { _clearCache(); return null; }

  // Fast path 2: recently validated — return the in-memory cached admin.
  // This is the key guard: navigating between admin pages will NOT fire a
  // new /me request for every mount; only the first mount (or after the
  // 5-minute TTL expires) reaches the network.
  const cached = _getCached();
  if (cached) return cached;

  // Network validation — only reached on the first mount or after TTL.
  const res = await apiFetch(`/office/admin/auth/me`, { scope: "admin" });
  if (!res.ok) {
    // Token invalid / expired / revoked — purge everything.
    localStorage.removeItem(OFFICE_ADMIN_TOKEN_KEY);
    localStorage.removeItem(OFFICE_ADMIN_STORAGE_KEY);
    _clearCache();
    return null;
  }
  const body = await res.json();
  _setCached(body.data);
  return body.data;
}

export async function adminLogout() {
  // Bust the cache immediately — must happen before the network call so a
  // slow/failed logout request doesn't leave a stale cached admin in memory.
  _clearCache();
  await apiFetch(`/office/admin/auth/logout`, { scope: "admin",
    method: "POST",
  }).catch(() => {});
  localStorage.removeItem(OFFICE_ADMIN_TOKEN_KEY);
  localStorage.removeItem(OFFICE_ADMIN_STORAGE_KEY);
}

export async function fetchAllEmployees({ includeAdmins = false } = {}) {
  const url = includeAdmins
    ? `/office/admin/employees?includeAdmins=true`
    : `/office/admin/employees`;
  const res = await apiFetch(url, { scope: "admin" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load employees.");
  return body.data;
}

export async function createEmployee(payload) {
  const res = await apiFetch(`/office/admin/employees`, { scope: "admin",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not create employee.");
  return body.data;
}

export async function toggleEmployeeActive(employeeId, isActive) {
  const res = await apiFetch(`/office/admin/employees/${employeeId}`, { scope: "admin",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not update employee.");
  return body;
}

export async function resetEmployeePassword(employeeId, password) {
  const res = await apiFetch(`/office/admin/employees/${employeeId}/password`, { scope: "admin",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not reset password.");
  return body;
}
