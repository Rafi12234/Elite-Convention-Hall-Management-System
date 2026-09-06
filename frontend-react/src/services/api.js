const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result.errors
      ? Object.values(result.errors).flat().join("\n")
      : "";

    throw new Error(result.error || validationErrors || result.message || "Request failed.");
  }

  return result;
}

export function customerHeaders() {
  const token = localStorage.getItem("dlc_customer_token_v1");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export function adminHeaders() {
  const token = localStorage.getItem("dlc_admin_token_v1");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}