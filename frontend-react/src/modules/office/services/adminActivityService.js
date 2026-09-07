import { apiFetch } from "../../shared/apiClient";
const API_ORIGIN = "";

export function resolveImageUrl(url) {
  if (!url) return "";
  return `${API_ORIGIN}${url}`;
}

export async function fetchAllMeetings() {
  const res = await apiFetch(`/office/admin/meetings`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load meetings.");
  return body.data;
}

export async function fetchAllCalls() {
  const res = await apiFetch(`/office/admin/calls`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load calls.");
  return body.data;
}

// Full meeting history for one client, same shape as ClientMeetingsPage's
// loadClientMeetings — used by the admin "Details" drill-down.
export async function fetchClientMeetingsForAdmin(rowKey) {
  const res = await apiFetch(`/office/admin/clients/${rowKey}/meetings`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load meeting details.");
  return body.data;
}

// Full call history for one client, same shape as ClientCallsPage's
// loadClientCalls — used by the admin "Details" drill-down.
export async function fetchClientCallsForAdmin(rowKey) {
  const res = await apiFetch(`/office/admin/clients/${rowKey}/calls`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load call details.");
  return body.data;
}

// nextMeetingDatetime: "YYYY-MM-DDTHH:MM" (or "" to clear the schedule)
export async function updateNextMeetingSchedule(meetingId, { nextMeetingDatetime, assignedEmployeeId }) {
  const res = await apiFetch(`/office/admin/meetings/${meetingId}/next`, { scope: "admin",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nextMeetingDatetime, assignedEmployeeId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not update the next meeting.");
  return body.data;
}

// nextCallDatetime: "YYYY-MM-DDTHH:MM" (or "" to clear the schedule)
export async function updateNextCallSchedule(callId, { nextCallDatetime, assignedEmployeeId }) {
  const res = await apiFetch(`/office/admin/calls/${callId}/next`, { scope: "admin",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nextCallDatetime, assignedEmployeeId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not update the next call.");
  return body.data;
}
