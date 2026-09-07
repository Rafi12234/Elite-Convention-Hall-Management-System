import { apiFetch } from "../../shared/apiClient";
// Returns { employees, clients, totals } — see adminDashboardController.js
// for the exact shape of each entry.
export async function fetchAdminDashboard() {
  const res = await apiFetch(`/office/admin/dashboard`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load the dashboard.");
  return body.data;
}

// Returns one client's full profile: every worksheet column, meeting/call
// history, and finalization status. See adminDashboardController.js's
// getClientDetail for the exact shape.
export async function fetchAdminClientDetail(rowKey) {
  const res = await apiFetch(`/office/admin/dashboard/clients/${rowKey}`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load this client.");
  return body.data;
}
