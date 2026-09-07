import { apiRequest } from "../../shared/apiClient";
import { DEFAULT_COLUMNS } from "../data/defaultSheet";



export async function loadEmployeeDirectory() {
  return apiRequest("/office/employees");
}

export function createDefaultWorkspace() {
  return {
    id: "meeting-management",
    name: "Meeting Management",
    columns: DEFAULT_COLUMNS,
    rows: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadWorkspace() {
  return apiRequest("/office/workspace/default");
}

export async function saveWorkspace(workspace, employeeId) {
  return apiRequest("/office/workspace/default", {
    method: "PUT",
    body: JSON.stringify({ workspace, employeeId }),
  });
}
