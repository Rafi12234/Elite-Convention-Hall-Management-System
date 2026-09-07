import { apiRequest as baseRequest } from "../../shared/apiClient";

const API_ORIGIN = "";

// Every endpoint here lives under the admin accounts prefix and is gated by
// the office-admin token — an employee token can never reach them.
function apiRequest(path, options = {}) {
  return baseRequest(`/office/admin/accounts${path}`, { scope: "admin", ...options });
}

// Admin Accounts APIs live under /api/admin/accounts and are gated by the
// admin session cookie — an employee session can never reach them.

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function resolveImageUrl(url) {
  if (!url) return "";
  return `${API_ORIGIN}${url}`;
}

export function formatTaka(amount) {
  const value = Number(amount) || 0;
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}\u09F3${abs}`;
}

export function formatDisplayDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year.slice(-2)}`;
}

export function formatDisplayDateTime(value) {
  if (!value) return "—";
  const [datePart, timePart = ""] = String(value).split(" ");
  return `${formatDisplayDate(datePart)}${timePart ? ` ${timePart.slice(0, 5)}` : ""}`;
}


// ─── Employees ─────────────────────────────────────────────────

export const loadEmployeeWallets = () => apiRequest("/employees", { scope: "admin" });
export const loadEmployeeProfile = (employeeId) => apiRequest(`/employees/${employeeId}`, { scope: "admin" });

// ─── Money In ──────────────────────────────────────────────────

export const loadMoneyIn = (params) => apiRequest(`/money-in${toQuery(params)}`, { scope: "admin" });

export const addMoneyToEmployee = (payload) =>
  apiRequest("/money-in", { scope: "admin", method: "POST", body: JSON.stringify(payload) });

export const updateMoneyIn = (id, payload) =>
  apiRequest(`/money-in/${id}`, { scope: "admin", method: "PATCH", body: JSON.stringify(payload) });

// ─── Expenses ──────────────────────────────────────────────────

export const loadExpenses = (params) => apiRequest(`/expenses${toQuery(params)}`, { scope: "admin" });
export const loadExpense = (id) => apiRequest(`/expenses/${id}`, { scope: "admin" });

// Pending-approval counts for the Bills nav badge and its Event/Regular
// sub-tabs — always the whole queue, ignoring whatever filters are set on
// the Bills page itself, so the number matches what the sidebar shows.
export async function loadPendingBillsCounts() {
  const baseParams = { pendingApproval: true, approved: "false", status: "active", page: 1, pageSize: 1 };
  const [event, regular] = await Promise.all([
    loadExpenses({ ...baseParams, costType: "event" }),
    loadExpenses({ ...baseParams, costType: "regular" }),
  ]);
  return { event: event.total, regular: regular.total, total: event.total + regular.total };
}

// Dry run — returns the wallet/vendor impact so it can be confirmed before saving.
export const previewExpenseUpdate = (id, items) =>
  apiRequest(`/expenses/${id}/preview`, { scope: "admin", method: "POST", body: JSON.stringify({ items }) });

export const updateExpense = (id, payload) =>
  apiRequest(`/expenses/${id}`, { scope: "admin", method: "PATCH", body: JSON.stringify(payload) });

export const voidExpense = (id, reason) =>
  apiRequest(`/expenses/${id}/void`, { scope: "admin", method: "POST", body: JSON.stringify({ reason }) });

export const approveExpense = (id) =>
  apiRequest(`/expenses/${id}/approve`, { scope: "admin", method: "POST" });

// ─── Vendors ───────────────────────────────────────────────────

export const loadVendors = (params) => apiRequest(`/vendors${toQuery(params)}`, { scope: "admin" });
export const loadVendorProfile = (id) => apiRequest(`/vendors/${id}`, { scope: "admin" });

// Every still-open bill for this vendor — powers the "Which bill is this
// settling?" picker so a payment never silently nets against an
// unrelated purchase that just happens to share the same vendor/event.
export const loadVendorOutstandingItems = (id) => apiRequest(`/vendors/${id}/outstanding`, { scope: "admin" });

// Sent in place of a specific bill id to sweep every outstanding bill for
// the vendor at once (see resolveSettlementTarget on the server).
export const SETTLE_ALL_SENTINEL = "ALL";

export const createVendor = (payload) =>
  apiRequest("/vendors", { scope: "admin", method: "POST", body: JSON.stringify(payload) });

export const updateVendor = (id, payload) =>
  apiRequest(`/vendors/${id}`, { scope: "admin", method: "PATCH", body: JSON.stringify(payload) });

export const setVendorStatus = (id, isActive, reason) =>
  apiRequest(`/vendors/${id}/status`, { scope: "admin",
    method: "PATCH",
    body: JSON.stringify({ isActive, reason }),
  });

export const addDirectVendorCost = (id, payload) =>
  apiRequest(`/vendors/${id}/cost`, { scope: "admin", method: "POST", body: JSON.stringify(payload) });

export const addDirectVendorPayment = (id, payload) =>
  apiRequest(`/vendors/${id}/pay`, { scope: "admin", method: "POST", body: JSON.stringify(payload) });

// ─── CSV export ────────────────────────────────────────────────

export function exportRowsToCsv(filename, columns, rows) {
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = [
    columns.map((column) => escape(column.label)).join(","),
    ...rows.map((row) => columns.map((column) => escape(column.value(row))).join(",")),
  ].join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
