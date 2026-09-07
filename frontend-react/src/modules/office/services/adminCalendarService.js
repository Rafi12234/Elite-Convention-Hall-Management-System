import { apiFetch } from "../../shared/apiClient";
export async function fetchAdminCalendarMonth(year, month) {
  const res = await apiFetch(`/office/admin/calendar?year=${year}&month=${month}`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load the calendar.");
  return body.data;
}
