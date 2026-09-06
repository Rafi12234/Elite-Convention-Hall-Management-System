import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CUSTOMER_TOKEN_KEY = "dlc_customer_token_v1";
const CUSTOMER_USER_KEY = "dlc_customer_user_v1";
const SELECTED_SLOT_KEY = "dlc_selected_slot_v2";

const registerStyles = String.raw`
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
    --warning: #e6a817;
    --transition: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(184,134,11,0.35); border-radius: 3px; }

  body {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    background:
      linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(30,10,0,0.80) 100%),
      url('/assets/img/BG-01.jpeg') center/cover no-repeat fixed;
    overflow-x: hidden;
  }

  body::before,
  body::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    animation: drift 12s ease-in-out infinite alternate;
  }

  body::before {
    width: 560px;
    height: 560px;
    background: radial-gradient(circle, rgba(184,134,11,0.16) 0%, transparent 70%);
    top: -180px;
    left: -180px;
    animation-duration: 10s;
  }

  body::after {
    width: 440px;
    height: 440px;
    background: radial-gradient(circle, rgba(184,134,11,0.13) 0%, transparent 70%);
    bottom: -150px;
    right: -150px;
    animation-duration: 14s;
    animation-delay: -4s;
  }

  @keyframes drift {
    from { transform: translate(0, 0) scale(1); }
    to { transform: translate(40px, 40px) scale(1.08); }
  }

  .register-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    position: relative;
    z-index: 1;
  }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 520px;
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
    background-size: 200% 100%;
    border-radius: 28px 28px 0 0;
    animation: shimmerBar 3s ease-in-out infinite;
  }

  @keyframes shimmerBar {
    0% { background-position: -100% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(52px) scale(0.93);
      filter: blur(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  .sparkle {
    position: absolute;
    border-radius: 50%;
    background: var(--gold);
    opacity: 0;
    pointer-events: none;
    animation: sparkleAnim 3.5s ease-in-out infinite;
  }

  .sparkle:nth-child(1) {
    width: 5px;
    height: 5px;
    top: 16%;
    right: 8%;
    animation-delay: 0s;
  }

  .sparkle:nth-child(2) {
    width: 4px;
    height: 4px;
    top: 55%;
    right: 5%;
    animation-delay: 1.4s;
  }

  .sparkle:nth-child(3) {
    width: 3px;
    height: 3px;
    top: 35%;
    left: 7%;
    animation-delay: 2.3s;
  }

  @keyframes sparkleAnim {
    0%, 100% {
      opacity: 0;
      transform: scale(0.5) translateY(0);
    }

    50% {
      opacity: 0.5;
      transform: scale(1.2) translateY(-14px);
    }
  }

  .logo {
    text-align: center;
    margin-bottom: 26px;
    animation: fadeDown 0.6s 0.15s both;
  }

  .logo-wrapper {
    display: inline-block;
    padding: 13px 22px;
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
    margin-bottom: 30px;
    animation: fadeDown 0.6s 0.25s both;
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

  .heading-block:hover h1::after { width: 80px; }

  .heading-block p {
    color: var(--gray-500);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.6;
    margin: 0;
  }

  .step-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: 28px;
    animation: fadeDown 0.6s 0.3s both;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    position: relative;
  }

  .step-circle {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--gray-300);
    background: var(--gray-100);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #bbb;
    transition: all var(--transition);
    position: relative;
    z-index: 1;
  }

  .step-label {
    font-size: 10px;
    font-weight: 600;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color var(--transition);
    white-space: nowrap;
  }

  .step-line {
    width: 60px;
    height: 2px;
    background: var(--gray-300);
    margin-bottom: 22px;
    transition: background var(--transition);
    position: relative;
    overflow: hidden;
  }

  .step-line::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--gold), var(--gold-light));
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step.active .step-circle {
    border-color: var(--gold);
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    box-shadow: 0 4px 14px var(--gold-glow);
  }

  .step.active .step-label { color: var(--gold); }

  .step.done .step-circle {
    border-color: var(--success);
    background: var(--success);
    color: white;
  }

  .step.done .step-label { color: var(--success); }
  .step-line.done::after { transform: scaleX(1); }

  form {
    display: grid;
    gap: 16px;
  }

  .step-panel {
    display: none;
    gap: 16px;
    animation: panelIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .step-panel.active {
    display: grid;
  }

  @keyframes panelIn {
    from { opacity: 0; transform: translateX(24px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes panelBack {
    from { opacity: 0; transform: translateX(-24px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .step-panel.back-anim { animation: panelBack 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

  .input-group {
    position: relative;
  }

  .input-group label {
    display: block;
    font-size: 11.5px;
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

  input {
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

  input::placeholder {
    color: #bbb;
    font-weight: 300;
  }

  input:hover {
    border-color: rgba(184,134,11,0.4);
    background: #fff;
  }

  input:focus {
    border-color: var(--gold);
    background: #fff;
    box-shadow: 0 0 0 4px var(--gold-glow), 0 2px 12px rgba(184,134,11,0.1);
    transform: translateY(-1px);
  }

  input.valid {
    border-color: var(--success);
    background: #fff;
  }

  input.invalid {
    border-color: var(--error);
    background: #fff;
  }

  .input-group:focus-within .input-icon { color: var(--gold); }
  .input-group:focus-within label { color: var(--gold); }

  .validation-icon {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%) scale(0);
    width: 18px;
    height: 18px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease;
  }

  .validation-icon.show { transform: translateY(-50%) scale(1); }
  .validation-icon.valid-icon { color: var(--success); }
  .validation-icon.invalid-icon { color: var(--error); }

  .has-toggle input { padding-right: 48px; }

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

  .field-hint {
    font-size: 11.5px;
    color: #bbb;
    margin-top: 5px;
    padding-left: 4px;
    transition: color var(--transition);
  }

  .field-hint.error-hint { color: var(--error); }

  .strength-bar-wrap {
    margin-top: 8px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
  }

  .strength-seg {
    height: 4px;
    border-radius: 2px;
    background: var(--gray-300);
    transition: background 0.4s ease;
  }

  .strength-seg.weak { background: var(--error); }
  .strength-seg.fair { background: var(--warning); }
  .strength-seg.good { background: var(--gold); }
  .strength-seg.strong { background: var(--success); }

  .strength-label {
    font-size: 11px;
    font-weight: 600;
    margin-top: 5px;
    color: #bbb;
    transition: color 0.3s;
  }

  .btn-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 4px;
  }

  .btn-row.single { grid-template-columns: 1fr; }

  .btn-back {
    border: 1.5px solid var(--gray-300);
    cursor: pointer;
    padding: 15px;
    border-radius: 50px;
    background: transparent;
    color: var(--gray-500);
    font-weight: 600;
    font-family: inherit;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition:
      border-color var(--transition),
      color var(--transition),
      background var(--transition),
      transform var(--transition);
  }

  .btn-back:hover {
    border-color: var(--gold);
    color: var(--gold);
    background: var(--gold-pale);
    transform: translateY(-2px);
  }

  .btn-back svg { transition: transform var(--transition); }
  .btn-back:hover svg { transform: translateX(-3px); }

  .btn-next,
  .btn-submit {
    position: relative;
    border: none;
    cursor: pointer;
    padding: 15px;
    border-radius: 50px;
    background: linear-gradient(135deg, var(--gold-dark) 0%, var(--gold) 50%, var(--gold-light) 100%);
    background-size: 200% 200%;
    color: white;
    font-weight: 700;
    font-family: inherit;
    font-size: 15px;
    letter-spacing: 0.4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition:
      background-position var(--transition),
      box-shadow var(--transition),
      transform var(--transition);
  }

  .btn-next::before,
  .btn-submit::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
    transform: skewX(-20deg) translateX(-150%);
    transition: transform 0.65s ease;
  }

  .btn-next:hover::before,
  .btn-submit:hover::before { transform: skewX(-20deg) translateX(250%); }

  .btn-next:hover,
  .btn-submit:hover {
    background-position: right center;
    box-shadow: 0 8px 28px rgba(184,134,11,0.45), 0 2px 8px rgba(0,0,0,0.15);
    transform: translateY(-2px);
  }

  .btn-next:active,
  .btn-submit:active { transform: translateY(0); }

  .btn-next svg { transition: transform var(--transition); }
  .btn-next:hover svg { transform: translateX(3px); }

  .btn-submit:disabled {
    opacity: 0.75;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: none;
    flex-shrink: 0;
  }

  .btn-submit.loading .spinner { display: block; }
  .btn-submit.loading .btn-text { opacity: 0.75; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .message {
    text-align: center;
    font-weight: 600;
    font-size: 13.5px;
    border-radius: 12px;
    padding: 0;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition:
      max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
      padding 0.4s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease;
  }

  .message.visible {
    max-height: 90px;
    padding: 11px 14px;
    opacity: 1;
  }

  .message.error {
    color: var(--error);
    background: rgba(220,53,69,0.08);
    border: 1px solid rgba(220,53,69,0.2);
  }

  .message.success {
    color: var(--success);
    background: rgba(25,135,84,0.08);
    border: 1px solid rgba(25,135,84,0.2);
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
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

  .bottom-link a:hover::after { width: 100%; }

  .terms-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .terms-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    min-width: 18px;
    padding: 0;
    accent-color: var(--gold);
    cursor: pointer;
    margin-top: 2px;
    transform: none;
  }

  .terms-row input[type="checkbox"]:focus {
    box-shadow: 0 0 0 3px var(--gold-glow);
    transform: none;
  }

  .terms-row label {
    font-size: 13px;
    color: var(--gray-500);
    line-height: 1.55;
    cursor: pointer;
    margin: 0 !important;
    font-weight: 400 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
    -webkit-text-fill-color: var(--gray-500) !important;
  }

  .terms-row label a {
    color: var(--gold);
    font-weight: 600;
    text-decoration: none;
  }

  .terms-row label a:hover { text-decoration: underline; }

  .summary-card {
    background: var(--gold-pale);
    border: 1px solid rgba(184,134,11,0.18);
    border-radius: 16px;
    padding: 18px 20px;
    display: grid;
    gap: 10px;
  }

  .summary-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin: 0;
  }

  .summary-rows {
    display: grid;
    gap: 8px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid rgba(184,134,11,0.1);
    gap: 12px;
  }

  .summary-row:last-child {
    border-bottom: none;
  }

  .summary-row span:first-child {
    font-size: 12px;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-row span:last-child {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--gray-700);
    max-width: 60%;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes shake {
    10%, 90% { transform: translateX(-4px); }
    20%, 80% { transform: translateX(6px); }
    30%, 50%, 70% { transform: translateX(-6px); }
    40%, 60% { transform: translateX(6px); }
  }

  @media (max-width: 540px) {
    .auth-card { padding: 36px 24px 30px; }
    .heading-block h1 { font-size: 26px; }
    .step-line { width: 40px; }
    .btn-row { grid-template-columns: 1fr; }
  }
`;

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
  terms: false,
};

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

function saveCustomerSession(payload) {
  const data = normalizeApiData(payload) || {};
  const token = data.token || data.access_token || payload?.token || payload?.access_token || "";
  const user = data.user || data.customer || payload?.user || payload?.customer || null;

  if (token) {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
  }

  return { token, user };
}

function hasSelectedSlot() {
  try {
    const raw = sessionStorage.getItem(SELECTED_SLOT_KEY);
    const selected = raw ? JSON.parse(raw) : null;

    return !!(
      selected &&
      selected.booking_slot_id &&
      selected.booking_date &&
      selected.booking_slot_label
    );
  } catch {
    return false;
  }
}

function toReactRoute(value) {
  const cleaned = String(value || "").trim();

  const map = {
    "": "/",
    "/": "/",
    home: "/",
    index: "/",

    booking: "/booking",
    "/booking": "/booking",

    payment: "/payment",
    "/payment": "/payment",

    congratulations: "/congratulations",
    "/congratulations": "/congratulations",

    "customer-panel": "/customer-panel",
    "/customer-panel": "/customer-panel",

    login: "/login",
    "/login": "/login",
  };

  return map[cleaned] || "/";
}

function getRedirectTarget(search) {
  const params = new URLSearchParams(search);
  const redirect = params.get("redirect") || "";
  const route = toReactRoute(redirect);

  if (route === "/booking" && !hasSelectedSlot()) {
    return "/";
  }

  return route;
}

function calcStrength(password) {
  let score = 0;

  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}

function strengthMeta(score) {
  const meta = {
    1: { label: "Weak", cls: "weak", color: "var(--error)" },
    2: { label: "Fair", cls: "fair", color: "var(--warning)" },
    3: { label: "Good", cls: "good", color: "var(--gold)" },
    4: { label: "Strong", cls: "strong", color: "var(--success)" },
  };

  return meta[score] || null;
}

function fieldState(field, form) {
  if (field === "name") {
    if (!form.name) return "";
    return form.name.trim().length >= 2 ? "valid" : "invalid";
  }

  if (field === "email") {
    if (!form.email) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "valid" : "invalid";
  }

  if (field === "phone") {
    if (!form.phone) return "";
    return form.phone.trim().length >= 7 ? "valid" : "invalid";
  }

  return "";
}

async function registerCustomer(payload) {
  if (typeof apiRequest === "function") {
    return apiRequest("/auth/register", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    throw new Error(result.error || validationErrors || result.message || "Registration failed");
  }

  return result;
}

function IconUser({ className = "input-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconMail({ className = "input-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconPhone({ className = "input-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.4 2 2 0 0 1 3.18 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconLock({ className = "input-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconShield({ className = "input-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCheck({ status = "", size = 18 }) {
  const invalid = status === "invalid";

  return (
    <svg
      className={`validation-icon ${status ? "show" : ""} ${invalid ? "invalid-icon" : "valid-icon"}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {invalid ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <polyline points="20 6 9 17 4 12" />
      )}
    </svg>
  );
}

function IconEye({ closed = false }) {
  if (closed) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(initialForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [isBackAnimation, setIsBackAnimation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [messages, setMessages] = useState({
    1: { text: "", type: "" },
    2: { text: "", type: "" },
    3: { text: "", type: "" },
  });

  const nameState = fieldState("name", form);
  const emailState = fieldState("email", form);
  const phoneState = fieldState("phone", form);
  const strengthScore = calcStrength(form.password);
  const strength = strengthMeta(strengthScore);

  const loginRedirect = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect") || (hasSelectedSlot() ? "booking" : "");
    return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  }, [location.search]);

  const showMessage = useCallback((step, text, type = "error") => {
    setMessages((current) => ({
      ...current,
      [step]: { text, type },
    }));
  }, []);

  const hideMessage = useCallback((step) => {
    setMessages((current) => ({
      ...current,
      [step]: { text: "", type: "" },
    }));
  }, []);

  const shakeCard = useCallback(() => {
    setIsShaking(false);
    window.requestAnimationFrame(() => {
      setIsShaking(true);
      window.setTimeout(() => setIsShaking(false), 500);
    });
  }, []);

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const goToStep = useCallback((step, isBack = false) => {
    setIsBackAnimation(isBack);
    setCurrentStep(step);
  }, []);

  const handleNextStep1 = useCallback(() => {
    hideMessage(1);

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name || name.length < 2) {
      showMessage(1, "Please enter your full name.", "error");
      shakeCard();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage(1, "Please enter a valid email address.", "error");
      shakeCard();
      return;
    }

    if (phone.length < 7) {
      showMessage(1, "Please enter a valid phone number.", "error");
      shakeCard();
      return;
    }

    goToStep(2);
  }, [form.email, form.name, form.phone, goToStep, hideMessage, shakeCard, showMessage]);

  const handleNextStep2 = useCallback(() => {
    hideMessage(2);

    if (form.password.length < 6) {
      showMessage(2, "Password must be at least 6 characters.", "error");
      shakeCard();
      return;
    }

    if (form.password !== form.password_confirmation) {
      showMessage(2, "Passwords do not match.", "error");
      shakeCard();
      return;
    }

    goToStep(3);
  }, [form.password, form.password_confirmation, goToStep, hideMessage, shakeCard, showMessage]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      hideMessage(3);

      if (!form.terms) {
        showMessage(3, "Please accept the Terms & Conditions to continue.", "error");
        shakeCard();
        return;
      }

      setIsSubmitting(true);

      try {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          password_confirmation: form.password_confirmation,
        };

        const result = await registerCustomer(payload);
        saveCustomerSession(result);

        showMessage(3, "✓ Account created! Redirecting…", "success");

        window.setTimeout(() => {
  navigate("/", { replace: true });
}, 800);
      } catch (error) {
        showMessage(3, error.message || "Registration failed. Please try again.", "error");
        shakeCard();
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      form.email,
      form.name,
      form.password,
      form.password_confirmation,
      form.phone,
      form.terms,
      hideMessage,
      location.search,
      navigate,
      shakeCard,
      showMessage,
    ]
  );

  return (
    <>
      <style>{registerStyles}</style>

      <main className="register-page">
        <div className={`auth-card ${isShaking ? "shake" : ""}`.trim()}>
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />

          <div className="logo">
            <div className="logo-wrapper">
              <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
            </div>
          </div>

          <div className="heading-block">
            <h1>Create Account</h1>
            <p>Join Elite Convention Hall and start booking with ease</p>
          </div>

          <div className="step-progress">
            <div className={`step ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "done" : ""}`.trim()}>
              <div className="step-circle">1</div>
              <span className="step-label">Profile</span>
            </div>

            <div className={`step-line ${currentStep > 1 ? "done" : ""}`.trim()} />

            <div className={`step ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "done" : ""}`.trim()}>
              <div className="step-circle">2</div>
              <span className="step-label">Security</span>
            </div>

            <div className={`step-line ${currentStep > 2 ? "done" : ""}`.trim()} />

            <div className={`step ${currentStep === 3 ? "active" : ""}`.trim()}>
              <div className="step-circle">3</div>
              <span className="step-label">Confirm</span>
            </div>
          </div>

          <form noValidate onSubmit={handleSubmit}>
            <div className={`step-panel ${currentStep === 1 ? "active" : ""} ${isBackAnimation ? "back-anim" : ""}`.trim()}>
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <IconUser />
                  <input
                    type="text"
                    id="name"
                    placeholder="e.g. Sadia Rahman"
                    required
                    autoComplete="name"
                    value={form.name}
                    className={nameState}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                  <IconCheck status={nameState} />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <IconMail />
                  <input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    value={form.email}
                    className={emailState}
                    onChange={(event) => updateForm("email", event.target.value)}
                  />
                  <IconCheck status={emailState} />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="phone">Phone Number</label>
                <div className="input-wrapper">
                  <IconPhone />
                  <input
                    type="tel"
                    id="phone"
                    placeholder="+880 1X XX XXX XXX"
                    required
                    autoComplete="tel"
                    value={form.phone}
                    className={phoneState}
                    onChange={(event) => updateForm("phone", event.target.value)}
                  />
                  <IconCheck status={phoneState} />
                </div>
              </div>

              <div className={`message ${messages[1].type} ${messages[1].text ? "visible" : ""}`.trim()}>
                {messages[1].text}
              </div>

              <div className="btn-row single">
                <button type="button" className="btn-next" onClick={handleNextStep1}>
                  Continue
                  <IconArrowRight />
                </button>
              </div>
            </div>

            <div className={`step-panel ${currentStep === 2 ? "active" : ""} ${isBackAnimation ? "back-anim" : ""}`.trim()}>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper has-toggle">
                  <IconLock />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Min. 6 characters"
                    minLength="6"
                    required
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    aria-label="Toggle password"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    <IconEye closed={showPassword} />
                  </button>
                </div>

                <div className="strength-bar-wrap">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      className={`strength-seg ${strength && item <= strengthScore ? strength.cls : ""}`.trim()}
                      key={item}
                    />
                  ))}
                </div>

                <div className="strength-label" style={{ color: strength ? strength.color : "#bbb" }}>
                  {strength ? `Password strength: ${strength.label}` : "Enter a password"}
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="passwordConfirmation">Confirm Password</label>
                <div className="input-wrapper has-toggle">
                  <IconShield />
                  <input
                    type={showPasswordConfirmation ? "text" : "password"}
                    id="passwordConfirmation"
                    placeholder="Re-enter your password"
                    minLength="6"
                    required
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={(event) => updateForm("password_confirmation", event.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    aria-label="Toggle confirm password"
                    onClick={() => setShowPasswordConfirmation((current) => !current)}
                  >
                    <IconEye closed={showPasswordConfirmation} />
                  </button>
                </div>

                <p
                  className={`field-hint ${
                    form.password_confirmation && form.password !== form.password_confirmation ? "error-hint" : ""
                  }`.trim()}
                  style={{
                    color:
                      form.password_confirmation && form.password === form.password_confirmation
                        ? "var(--success)"
                        : undefined,
                  }}
                >
                  {!form.password_confirmation
                    ? ""
                    : form.password === form.password_confirmation
                      ? "✓ Passwords match"
                      : "✗ Passwords do not match"}
                </p>
              </div>

              <div className={`message ${messages[2].type} ${messages[2].text ? "visible" : ""}`.trim()}>
                {messages[2].text}
              </div>

              <div className="btn-row">
                <button type="button" className="btn-back" onClick={() => goToStep(1, true)}>
                  <IconArrowLeft />
                  Back
                </button>
                <button type="button" className="btn-next" onClick={handleNextStep2}>
                  Continue
                  <IconArrowRight />
                </button>
              </div>
            </div>

            <div className={`step-panel ${currentStep === 3 ? "active" : ""} ${isBackAnimation ? "back-anim" : ""}`.trim()}>
              <div className="summary-card">
                <p className="summary-title">Account Summary</p>
                <div className="summary-rows">
                  <div className="summary-row">
                    <span>Name</span>
                    <span>{form.name.trim() || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span>Email</span>
                    <span>{form.email.trim() || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span>Phone</span>
                    <span>{form.phone.trim() || "—"}</span>
                  </div>
                  <div className="summary-row">
                    <span>Password</span>
                    <span>••••••••</span>
                  </div>
                </div>
              </div>

              <div className="terms-row">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={form.terms}
                  onChange={(event) => updateForm("terms", event.target.checked)}
                />
                <label htmlFor="terms">
                  I agree to the <a href="#">Terms &amp; Conditions</a> and{" "}
                  <a href="#">Privacy Policy</a> of Elite Convention Hall.
                </label>
              </div>

              <div className={`message ${messages[3].type} ${messages[3].text ? "visible" : ""}`.trim()}>
                {messages[3].text}
              </div>

              <div className="btn-row">
                <button type="button" className="btn-back" onClick={() => goToStep(2, true)}>
                  <IconArrowLeft />
                  Back
                </button>

                <button
                  type="submit"
                  className={`btn-submit ${isSubmitting ? "loading" : ""}`.trim()}
                  disabled={isSubmitting}
                >
                  <div className="spinner" />
                  <span className="btn-text">{isSubmitting ? "Creating..." : "Create Account"}</span>
                </button>
              </div>
            </div>
          </form>

          <div className="divider" style={{ marginTop: "22px" }}>
            <div className="divider-line" />
            <span>already a member?</span>
            <div className="divider-line" />
          </div>

          <div className="bottom-section">
            <p className="bottom-link">
              Have an account? <Link to={loginRedirect}>Login here</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}