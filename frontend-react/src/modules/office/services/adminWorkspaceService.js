import { apiFetch } from "../../shared/apiClient";
// Read-only mirror of the employee side's loadWorkspace — same live
// dynamic columns/rows, minus the Last/Next Meeting Time (LAT/NAT)
// columns. See adminWorkspaceController.js for the exact shape.
export async function fetchAdminWorkspace() {
  const res = await apiFetch(`/office/admin/workspace`, { scope: "admin",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not load the client table.");
  return body.data;
}

// Edits exactly one cell — deliberately scoped (not a whole-sheet replace)
// so the admin's LAT/NAT-less view can never touch other rows/columns.
export async function updateAdminWorkspaceCell(rowKey, columnKey, value) {
  const res = await apiFetch(`/office/admin/workspace/rows/${rowKey}`, { scope: "admin",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnKey, value }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Could not save the change.");
  return body.data;
}
