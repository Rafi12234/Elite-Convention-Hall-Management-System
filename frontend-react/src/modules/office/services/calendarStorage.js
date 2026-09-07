import { apiRequest } from "../../shared/apiClient";
export async function loadCalendarMonth(year, month) {
  return apiRequest(`/office/calendar?year=${year}&month=${month}`);
}

export async function createCalendarEvent(data) {
  return apiRequest("/office/calendar/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCalendarEvent(id, data) {
  return apiRequest(`/office/calendar/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCalendarEvent(id) {
  return apiRequest(`/office/calendar/events/${id}`, {
    method: "DELETE",
  });
}
