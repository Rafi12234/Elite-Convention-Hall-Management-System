import { apiRequest } from "../../shared/apiClient";
export async function loadClientCalls(rowKey) {
  return apiRequest(`/office/calls/${rowKey}`);
}

export async function createCall(rowKey, { callDatetime, callDiscussion, employeeId }) {
  return apiRequest(`/office/calls/${rowKey}`, {
    method: "POST",
    body: JSON.stringify({ callDatetime, callDiscussion, employeeId }),
  });
}

export async function updateCall(rowKey, callId, { callDatetime, callDiscussion, nextCallDatetime, nextCallAssignedEmployeeId, employeeId }) {
  return apiRequest(`/office/calls/${rowKey}/${callId}`, {
    method: "PUT",
    body: JSON.stringify({ callDatetime, callDiscussion, nextCallDatetime, nextCallAssignedEmployeeId, employeeId }),
  });
}

export async function deleteCall(rowKey, callId) {
  return apiRequest(`/office/calls/${rowKey}/${callId}`, {
    method: "DELETE",
  });
}
