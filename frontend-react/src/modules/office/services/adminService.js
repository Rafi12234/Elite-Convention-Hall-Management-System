import {
  apiFetch,
  OFFICE_ADMIN_STORAGE_KEY,
  OFFICE_ADMIN_TOKEN_KEY,
} from "../../shared/apiClient";

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

  return admin;
}

export async function fetchAdminMe() {
  const res = await apiFetch(`/office/admin/auth/me`, { scope: "admin",
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.data;
}

export async function adminLogout() {
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
