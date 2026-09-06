import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest, customerHeaders } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CUSTOMER_TOKEN_KEY = "dlc_customer_token_v1";
const  CUSTOMER_USER_KEY = "dlc_customer_user_v1";

const changePasswordStyles = String.raw`
  *, *::before, *::after { 
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    background: #faf7f2;
    min-height: 100vh;
    margin: 0;
  }

  .change-password-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 18px;
    background: #faf7f2;
  }

  .card {
    width: 100%;
    max-width: 440px;
    background: white;
    border: 1px solid #ead7a6;
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  }

  .card h1 {
    color: #8f6908;
    margin-top: 0;
    font-size: 26px;
  }

  .card p {
    color: #6b7280;
    line-height: 1.6;
    font-size: 14px;
  }

  .card label {
    display: block;
    font-weight: 700;
    margin: 14px 0 7px;
  }

  .card input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd6c5;
    border-radius: 10px;
    font-size: 15px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .card input:focus {
    border-color: #b8860b;
    box-shadow: 0 0 0 3px rgba(184,134,11,0.18);
  }

  .card button {
    width: 100%;
    margin-top: 18px;
    padding: 13px;
    background: linear-gradient(135deg, #8f6908, #b8860b);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: opacity 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }

  .card button:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(184,134,11,0.25);
  }

  .card button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .message {
    display: none;
    margin-top: 14px;
    padding: 12px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    white-space: pre-line;
  }

  .message.show {
    display: block;
  }

  .message.error {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }

  .message.success {
    background: rgba(25, 135, 84, 0.1);
    color: #198754;
  }
`;

const initialForm = {
  current_password: "",
  new_password: "",
  new_password_confirmation: "",
};

function getToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

function buildCustomerHeaders() {
  const token = getToken();

  let helperHeaders = {};

  try {
    helperHeaders = typeof customerHeaders === "function" ? customerHeaders(token) : {};
  } catch {
    try {
      helperHeaders = typeof customerHeaders === "function" ? customerHeaders() : {};
    } catch {
      helperHeaders = {};
    }
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(helperHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function toReactRoute(value) {
  const cleaned = String(value || "").trim();

  if (!cleaned || cleaned === "/" || cleaned === "index.html") return "/";
  if (cleaned === "login" || cleaned === "login.html" || cleaned === "/login") return "/login";
  if (cleaned === "booking" || cleaned === "booking.html" || cleaned === "/booking") return "/booking";
  if (cleaned === "payment" || cleaned === "payment.html" || cleaned === "/payment") return "/payment";
  if (cleaned === "congratulations" || cleaned === "congratulations.html" || cleaned === "/congratulations") return "/congratulations";
  if (cleaned === "customer-panel" || cleaned === "customer-panel.html" || cleaned === "/customer-panel") return "/customer-panel";
  if (cleaned === "change-password" || cleaned === "change-password.html" || cleaned === "/change-password") return "/change-password";

  return cleaned.startsWith("/") ? cleaned : `/${cleaned.replace(".html", "")}`;
}

function getMessageFromError(error, fallback) {
  return error?.message || fallback;
}

async function requestCustomerApi(endpoint, options = {}) {
  const headers = {
    ...buildCustomerHeaders(),
    ...(options.headers || {}),
  };

  if (typeof apiRequest === "function") {
    return apiRequest(endpoint, {
      ...options,
      headers,
    });
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    const error = new Error(result.message || validationErrors || result.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return result;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({
    text: "",
    type: "error",
    show: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return toReactRoute(params.get("redirect") || "index.html");
  }, [location.search]);

  const showMessage = useCallback((text, type = "error") => {
    setMessage({
      text,
      type,
      show: true,
    });
  }, []);

  const clearCustomerSession = useCallback(() => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_USER_KEY);
  }, []);

  const redirectToLogin = useCallback(() => {
    clearCustomerSession();
    navigate("/login");
  }, [clearCustomerSession, navigate]);

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const checkAccess = useCallback(async () => {
    const token = getToken();

    if (!token) {
      redirectToLogin();
      return;
    }

    setIsCheckingAccess(true);

    try {
      const result = await requestCustomerApi("/auth/me", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = normalizeApiData(result) || {};
      const user = data.user || result?.user || data;

      if (user && Object.keys(user).length) {
        localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
      }

      if (user && !user.must_change_password) {
        navigate(redirectUrl);
      }
    } catch {
      redirectToLogin();
    } finally {
      setIsCheckingAccess(false);
    }
  }, [navigate, redirectToLogin, redirectUrl]);

  const submitChangePassword = useCallback(
    async (event) => {
      event.preventDefault();

      const token = getToken();

      if (!token) {
        redirectToLogin();
        return;
      }

      if (form.new_password !== form.new_password_confirmation) {
        showMessage("New password and confirmation password do not match.", "error");
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await requestCustomerApi("/auth/change-password", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: form.current_password,
            new_password: form.new_password,
            new_password_confirmation: form.new_password_confirmation,
          }),
        });

        const data = normalizeApiData(result) || {};

        if (data.token) {
          localStorage.setItem(CUSTOMER_TOKEN_KEY, data.token);
        }

        if (data.user) {
          localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(data.user));
        }

        showMessage("Password changed successfully. Redirecting...", "success");

        window.setTimeout(() => {
          navigate("/");
        }, 900);
      } catch (error) {
        showMessage(getMessageFromError(error, "Unable to change password."), "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      form.current_password,
      form.new_password,
      form.new_password_confirmation,
      navigate,
      redirectToLogin,
      showMessage,
    ]
  );

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return (
    <>
      <style>{changePasswordStyles}</style>

      <main className="change-password-page">
        <div className="card">
          <h1>Change Password</h1>
          <p>
            Your account was created by admin. For security, please change your temporary password before continuing.
          </p>

          <form onSubmit={submitChangePassword}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              required
              placeholder="Admin provided password"
              value={form.current_password}
              onChange={(event) => updateForm("current_password", event.target.value)}
              disabled={isCheckingAccess || isSubmitting}
            />

            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              required
              minLength="8"
              placeholder="New password"
              value={form.new_password}
              onChange={(event) => updateForm("new_password", event.target.value)}
              disabled={isCheckingAccess || isSubmitting}
            />

            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              required
              minLength="8"
              placeholder="Confirm new password"
              value={form.new_password_confirmation}
              onChange={(event) => updateForm("new_password_confirmation", event.target.value)}
              disabled={isCheckingAccess || isSubmitting}
            />

            <button type="submit" disabled={isCheckingAccess || isSubmitting}>
              {isCheckingAccess ? "Checking..." : isSubmitting ? "Saving..." : "Save New Password"}
            </button>
          </form>

          <div className={`message ${message.type} ${message.show ? "show" : ""}`.trim()}>
            {message.text}
          </div>
        </div>
      </main>
    </>
  );
}