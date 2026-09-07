import {
  apiRequest,
  EMPLOYEE_STORAGE_KEY,
  EMPLOYEE_TOKEN_KEY,
} from "../../shared/apiClient";

// Uses localStorage (not sessionStorage) so the signed-in employee survives
// closing the tab/browser entirely. Upstream this was an effectively
// permanent httpOnly cookie; here the equivalent credential is the bearer
// token issued by /office/employees/identify.
export function loadCurrentEmployee() {
  try {
    const raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCurrentEmployee({ email, password }) {
  const savedEmployee = await apiRequest("/office/employees/identify", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (savedEmployee.token) {
    localStorage.setItem(EMPLOYEE_TOKEN_KEY, savedEmployee.token);
  }

  const { token, ...employee } = savedEmployee;
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(employee));
  return employee;
}

export async function changeEmployeePassword({ currentPassword, newPassword }) {
  const updatedEmployee = await apiRequest("/office/employees/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const merged = { ...loadCurrentEmployee(), ...updatedEmployee };
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

// Powers the Management page header widget (meetings/calls due vs.
// completed today for the logged-in employee).
export async function fetchTodaySummary() {
  return apiRequest("/office/employees/me/today-summary");
}

export function clearCurrentEmployee() {
  // Revoke server-side first — dropping the token locally would make the
  // logout request go out unauthenticated and leave it valid on the server.
  apiRequest("/office/employees/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem(EMPLOYEE_STORAGE_KEY);
  localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
}
