import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CUSTOMER_TOKEN_KEY = "dlc_customer_token_v1";
const CUSTOMER_USER_KEY = "dlc_customer_user_v1";
const SELECTED_SLOT_KEY = "dlc_selected_slot_v2";

const loginPageStyles = String.raw`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    --gold: #b8860b;
    --gold-light: #d4a017;
    --gold-dark: #8f6908;
    --gold-pale: rgba(184, 134, 11, 0.08);
    --gold-glow: rgba(184, 134, 11, 0.25);
    --white: #ffffff;
    --gray-100: #f8f8f8;
    --gray-300: #dddddd;
    --gray-500: #888888;
    --gray-700: #444444;
    --error: #dc3545;
    --success: #198754;
    --transition: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .login-page {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    background:
      linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(30,10,0,0.78) 100%),
      url('/assets/img/BG-01.jpeg') center/cover no-repeat fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: hidden;
    position: relative;
  }

  .login-page::before,
  .login-page::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    animation: drift 12s ease-in-out infinite alternate;
  }

  .login-page::before {
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, rgba(184,134,11,0.18) 0%, transparent 70%);
    top: -160px;
    left: -160px;
    animation-duration: 10s;
  }

  .login-page::after {
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(184,134,11,0.14) 0%, transparent 70%);
    bottom: -140px;
    right: -140px;
    animation-duration: 14s;
    animation-delay: -4s;
  }

  @keyframes drift {
    from {
      transform: translate(0, 0) scale(1);
    }

    to {
      transform: translate(40px, 40px) scale(1.08);
    }
  }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 480px;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 28px;
    padding: 44px 42px 38px;
    box-shadow:
      0 2px 0 rgba(184,134,11,0.35) inset,
      0 32px 80px rgba(0,0,0,0.32),
      0 4px 24px rgba(184,134,11,0.12);
    border: 1px solid rgba(184,134,11,0.18);
    animation: cardIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
    overflow: hidden;
    z-index: 2;
  }

  .auth-card.shake {
    animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  .auth-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent 0%, var(--gold) 30%, var(--gold-light) 50%, var(--gold) 70%, transparent 100%);
    border-radius: 28px 28px 0 0;
    animation: shimmerBar 3s ease-in-out infinite;
    background-size: 200% 100%;
  }

  @keyframes shimmerBar {
    0% {
      background-position: -100% 0;
    }

    100% {
      background-position: 200% 0;
    }
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(48px) scale(0.94);
      filter: blur(6px);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes shake {
    10%, 90% {
      transform: translateX(-4px);
    }

    20%, 80% {
      transform: translateX(6px);
    }

    30%, 50%, 70% {
      transform: translateX(-6px);
    }

    40%, 60% {
      transform: translateX(6px);
    }
  }

  .logo {
    text-align: center;
    margin-bottom: 28px;
    animation: fadeDown 0.6s 0.2s both;
  }

  .logo-wrapper {
    display: inline-block;
    position: relative;
    padding: 14px 24px;
    background: linear-gradient(135deg, rgba(184,134,11,0.06), rgba(184,134,11,0.02));
    border-radius: 16px;
    border: 1px solid rgba(184,134,11,0.14);
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .logo-wrapper:hover {
    box-shadow: 0 8px 28px var(--gold-glow);
    transform: translateY(-2px);
  }

  .logo img {
    height: 44px;
    max-width: 200px;
    display: block;
  }

  .heading-block {
    text-align: center;
    margin-bottom: 32px;
    animation: fadeDown 0.6s 0.3s both;
  }

  .heading-block h1 {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
    position: relative;
    display: inline-block;
  }

  .heading-block h1::after {
    content: '';
    display: block;
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--gold-light));
    border-radius: 2px;
    margin: 8px auto 0;
    transition: width var(--transition);
  }

  .heading-block:hover h1::after {
    width: 80px;
  }

  .heading-block p {
    color: var(--gray-500);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.6;
    margin: 0;
  }

  .login-form {
    display: grid;
    gap: 18px;
    animation: fadeDown 0.6s 0.4s both;
  }

  .input-group {
    position: relative;
  }

  .input-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--gold-dark);
    letter-spacing: 0.6px;
    text-transform: uppercase;
    margin-bottom: 7px;
    transition: color var(--transition);
  }

  .input-wrapper {
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: var(--gray-500);
    transition: color var(--transition);
    pointer-events: none;
  }

  .login-input {
    width: 100%;
    padding: 15px 16px 15px 48px;
    border: 1.5px solid var(--gray-300);
    border-radius: 14px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 400;
    color: var(--gray-700);
    background: var(--gray-100);
    outline: none;
    transition:
      border-color var(--transition),
      background var(--transition),
      box-shadow var(--transition),
      transform var(--transition);
  }

  .login-input.password-input {
    padding-right: 50px;
  }

  .login-input::placeholder {
    color: #bbb;
    font-weight: 300;
  }

  .login-input:hover {
    border-color: rgba(184,134,11,0.4);
    background: #fff;
  }

  .login-input:focus {
    border-color: var(--gold);
    background: #fff;
    box-shadow:
      0 0 0 4px var(--gold-glow),
      0 2px 12px rgba(184,134,11,0.1);
    transform: translateY(-1px);
  }

  .input-group:focus-within .input-icon {
    color: var(--gold);
  }

  .input-group:focus-within label {
    color: var(--gold);
  }

  .toggle-password {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--gray-500);
    transition: color var(--transition), transform var(--transition);
    display: flex;
    align-items: center;
  }

  .toggle-password:hover {
    color: var(--gold);
    transform: translateY(-50%) scale(1.15);
  }

  .forgot-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -6px;
  }

  .forgot-link {
    font-size: 12.5px;
    color: var(--gold);
    font-weight: 600;
    text-decoration: none;
    position: relative;
    transition: color var(--transition);
    background: transparent;
    border: none;
    font-family: inherit;
    cursor: pointer;
  }

  .forgot-link::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 0;
    height: 1.5px;
    background: var(--gold);
    transition: width var(--transition);
  }

  .forgot-link:hover::after {
    width: 100%;
  }

  .btn-submit {
    position: relative;
    border: none;
    cursor: pointer;
    padding: 16px;
    border-radius: 50px;
    background: linear-gradient(135deg, var(--gold-dark) 0%, var(--gold) 50%, var(--gold-light) 100%);
    background-size: 200% 200%;
    color: white;
    font-weight: 700;
    font-family: inherit;
    font-size: 15px;
    letter-spacing: 0.5px;
    overflow: hidden;
    transition:
      background-position var(--transition),
      box-shadow var(--transition),
      transform var(--transition);
    margin-top: 6px;
  }

  .btn-submit::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
    transform: skewX(-20deg) translateX(-150%);
    transition: transform 0.7s ease;
  }

  .btn-submit:hover::before {
    transform: skewX(-20deg) translateX(250%);
  }

  .btn-submit:hover {
    background-position: right center;
    box-shadow: 0 8px 28px rgba(184,134,11,0.45), 0 2px 8px rgba(0,0,0,0.15);
    transform: translateY(-2px);
  }

  .btn-submit:active {
    transform: translateY(0);
    box-shadow: 0 4px 14px rgba(184,134,11,0.3);
  }

  .btn-submit:disabled {
    opacity: 0.75;
    cursor: not-allowed;
    transform: none;
  }

  .btn-inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: none;
  }

  .btn-submit.loading .spinner {
    display: block;
  }

  .btn-submit.loading .btn-text {
    opacity: 0.75;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message {
    min-height: 20px;
    text-align: center;
    font-weight: 600;
    font-size: 13.5px;
    border-radius: 10px;
    padding: 0;
    overflow: hidden;
    max-height: 0;
    transition:
      max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
      padding 0.4s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease;
    opacity: 0;
    white-space: pre-line;
  }

  .message.visible {
    max-height: 90px;
    padding: 10px 14px;
    opacity: 1;
  }

  .message.error {
    color: var(--error);
    background: rgba(220, 53, 69, 0.08);
    border: 1px solid rgba(220, 53, 69, 0.2);
  }

  .message.success {
    color: var(--success);
    background: rgba(25, 135, 84, 0.08);
    border: 1px solid rgba(25, 135, 84, 0.2);
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    animation: fadeDown 0.6s 0.5s both;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gray-300), transparent);
  }

  .divider span {
    font-size: 12px;
    color: #bbb;
    font-weight: 500;
    white-space: nowrap;
  }

  .bottom-section {
    margin-top: 20px;
    text-align: center;
    animation: fadeDown 0.6s 0.55s both;
  }

  .bottom-link {
    font-size: 14px;
    color: var(--gray-500);
    margin-bottom: 14px;
  }

  .bottom-link a {
    color: var(--gold);
    font-weight: 700;
    text-decoration: none;
    position: relative;
    transition: color var(--transition);
  }

  .bottom-link a::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 0;
    height: 1.5px;
    background: var(--gold);
    transition: width var(--transition);
    border-radius: 1px;
  }

  .bottom-link a:hover::after {
    width: 100%;
  }

  .home-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gray-500);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    padding: 9px 20px;
    border-radius: 50px;
    border: 1.5px solid var(--gray-300);
    transition:
      color var(--transition),
      border-color var(--transition),
      background var(--transition),
      transform var(--transition),
      box-shadow var(--transition);
  }

  .home-link:hover {
    color: var(--gold);
    border-color: var(--gold);
    background: var(--gold-pale);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--gold-glow);
  }

  .home-link svg {
    transition: transform var(--transition);
  }

  .home-link:hover svg {
    transform: translateX(-3px);
  }

  .sparkle {
    position: absolute;
    border-radius: 50%;
    background: var(--gold);
    opacity: 0;
    pointer-events: none;
    animation: sparkleAnim 3s ease-in-out infinite;
  }

  .sparkle:nth-child(1) {
    width: 5px;
    height: 5px;
    top: 18%;
    right: 10%;
    animation-delay: 0s;
  }

  .sparkle:nth-child(2) {
    width: 4px;
    height: 4px;
    top: 60%;
    right: 6%;
    animation-delay: 1.2s;
  }

  .sparkle:nth-child(3) {
    width: 3px;
    height: 3px;
    top: 38%;
    left: 8%;
    animation-delay: 2.1s;
  }

  @keyframes sparkleAnim {
    0%, 100% {
      opacity: 0;
      transform: scale(0.5) translateY(0);
    }

    50% {
      opacity: 0.55;
      transform: scale(1.2) translateY(-12px);
    }
  }

  @keyframes fadeDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 520px) {
    .auth-card {
      padding: 36px 26px 30px;
    }

    .heading-block h1 {
      font-size: 26px;
    }
  }
`;

function readJsonFromSession(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasValidSelectedSlot() {
  const selected = readJsonFromSession(SELECTED_SLOT_KEY);

  return !!(
    selected &&
    selected.booking_slot_id &&
    selected.booking_date &&
    selected.booking_slot_label
  );
}

function normalizeRedirect(value) {
  if (!value || typeof value !== "string") return "";

  const clean = value.trim();

  const map = {
    "booking.html": "booking",
    booking: "booking",
    "/booking": "booking",
    "customer-panel.html": "customer-panel",
    "customer-panel": "customer-panel",
    "/customer-panel": "customer-panel",
    "index.html": "home",
    index: "home",
    "/": "home",
    home: "home",
  };

  return map[clean] || "";
}

function getRedirectPath(search) {
  const params = new URLSearchParams(search);
  const redirectType = normalizeRedirect(params.get("redirect"));

  if (redirectType === "booking" && hasValidSelectedSlot()) {
    return "/booking";
  }

  if (redirectType === "booking" && !hasValidSelectedSlot()) {
    return "/#calendar-booking";
  }

  if (redirectType === "customer-panel") {
    return "/customer-panel";
  }

  return "/";
}

function getRegisterRedirectValue(search) {
  const redirectPath = getRedirectPath(search);

  if (redirectPath === "/booking") return "booking";
  if (redirectPath === "/customer-panel") return "customer-panel";

  return "";
}

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

async function requestApi(endpoint, options = {}) {
  if (typeof apiRequest === "function") {
    return apiRequest(endpoint, options);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = payload?.errors
      ? Object.values(payload.errors).flat().join("\n")
      : "";

    throw new Error(payload?.error || validationErrors || payload?.message || "API request failed");
  }

  return payload;
}

function saveCustomerAuthSession(data) {
  if (data?.token) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, data.token);
  }

  if (data?.user) {
    localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(data.user));
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginValue, setLoginValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

const registerHref = useMemo(() => {
  const redirectValue = getRegisterRedirectValue(location.search);

  return redirectValue
    ? `/register?redirect=${encodeURIComponent(redirectValue)}`
    : "/register";
}, [location.search]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
  };

  const hideMessage = () => {
    setMessage({ text: "", type: "" });
  };

  const triggerShake = () => {
    setIsShaking(false);

    requestAnimationFrame(() => {
      setIsShaking(true);

      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    });
  };

  const handleForgotPassword = (event) => {
    event.preventDefault();
    showMessage("Please contact Elite Convention Hall support to reset your password.", "error");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    hideMessage();

    const trimmedLogin = loginValue.trim();

    if (!trimmedLogin || !passwordValue) {
      showMessage("Please enter your email or phone and password.", "error");
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await requestApi("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          login: trimmedLogin,
          password: passwordValue,
        }),
      });

      const data = normalizeApiData(payload);

      saveCustomerAuthSession(data);

      const finalRedirectPath = getRedirectPath(location.search);

      if (data?.must_change_password) {
        showMessage("Password change required — redirecting…", "success");

        setTimeout(() => {
          navigate(`/change-password?redirect=${encodeURIComponent(finalRedirectPath)}`);
        }, 700);

        return;
      }

      showMessage("✓ Login successful — redirecting…", "success");

      setTimeout(() => {
        navigate(finalRedirectPath);
      }, 900);
    } catch (error) {
      showMessage(error.message || "Login failed. Please try again.", "error");
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{loginPageStyles}</style>

      <main className="login-page">
        <div className={`auth-card${isShaking ? " shake" : ""}`}>
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />

          <div className="logo">
            <div className="logo-wrapper">
              <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
            </div>
          </div>

          <div className="heading-block">
            <h1>Welcome Back</h1>
            <p>Sign in to continue your booking experience</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label htmlFor="email">Email or Phone</label>

              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>

                <input
                  type="text"
                  id="email"
                  className="login-input"
                  placeholder="Email or phone number"
                  required
                  autoComplete="username"
                  value={loginValue}
                  onChange={(event) => setLoginValue(event.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>

                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="login-input password-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={passwordValue}
                  onChange={(event) => setPasswordValue(event.target.value)}
                />

                <button
                  type="button"
                  className="toggle-password"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="forgot-row">
              <button type="button" className="forgot-link" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </div>

            <button
              className={`btn-submit${isSubmitting ? " loading" : ""}`}
              type="submit"
              disabled={isSubmitting}
            >
              <div className="btn-inner">
                <div className="spinner" />
                <span className="btn-text">
                  {isSubmitting ? "Logging in..." : "Login to Account"}
                </span>
              </div>
            </button>

            <div
              className={`message${message.text ? ` ${message.type} visible` : ""}`}
              role="alert"
              aria-live="polite"
            >
              {message.text}
            </div>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span>don&apos;t have an account?</span>
            <div className="divider-line" />
          </div>

          <div className="bottom-section">
            <p className="bottom-link">
              New member? <a href={registerHref}>Create an account</a>
            </p>

            <Link className="home-link" to="/">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}