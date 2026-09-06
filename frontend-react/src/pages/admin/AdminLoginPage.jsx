import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, adminHeaders } from "../../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

const adminLoginStyles = String.raw`
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
    --gold-pale: rgba(184,134,11,0.08);
    --gold-glow: rgba(184,134,11,0.25);
    --red: #dc3545;
    --green: #198754;
    --gray-100: #f8f8f8;
    --gray-300: #dddddd;
    --gray-500: #888888;
    --gray-700: #444444;
    --transition: 0.35s cubic-bezier(0.4,0,0.2,1);
  }

  body {
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
    background:
      linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(20,5,0,0.82) 100%),
      url('/assets/img/BG-01.jpeg') center/cover no-repeat fixed;
    overflow: hidden;
  }

  body::before,
  body::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
  }

  body::before {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(184,134,11,0.15) 0%, transparent 70%);
    top: -160px;
    left: -160px;
    animation: orbDrift 11s ease-in-out infinite alternate;
  }

  body::after {
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(184,134,11,0.12) 0%, transparent 70%);
    bottom: -140px;
    right: -140px;
    animation: orbDrift 15s ease-in-out infinite alternate-reverse;
  }

  @keyframes orbDrift {
    from {
      transform: translate(0,0) scale(1);
    }

    to {
      transform: translate(45px,45px) scale(1.1);
    }
  }

  .admin-login-page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(8px, 3vh, 24px) 20px;
    position: relative;
    z-index: 1;
  }

  .admin-card {
    position: relative;
    width: 100%;
    max-width: 470px;
    max-height: calc(100vh - 16px);
    display: flex;
    flex-direction: column;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 28px;
    box-shadow:
      0 2px 0 rgba(184,134,11,0.4) inset,
      0 30px 80px rgba(0,0,0,0.35),
      0 4px 20px rgba(184,134,11,0.1);
    border: 1px solid rgba(184,134,11,0.16);
    animation: cardIn 0.7s cubic-bezier(0.22,1,0.36,1) both;
    overflow: hidden;
  }

  .admin-card-body {
    padding: clamp(18px, 5vh, 46px) clamp(20px, 5vw, 42px) clamp(16px, 4vh, 40px);
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }

  .admin-card.shake {
    animation: shake 0.45s cubic-bezier(0.36,0.07,0.19,0.97) both;
  }

  .admin-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg,
      transparent 0%,
      var(--gold-dark) 20%,
      var(--gold) 40%,
      var(--gold-light) 50%,
      var(--gold) 60%,
      var(--gold-dark) 80%,
      transparent 100%);
    background-size: 200% 100%;
    border-radius: 28px 28px 0 0;
    animation: shimmer 2.5s ease-in-out infinite;
  }

  @keyframes shimmer {
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
      transform: translateY(50px) scale(0.93);
      filter: blur(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  .admin-ribbon {
    position: absolute;
    top: 20px;
    right: -32px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 5px 44px;
    transform: rotate(45deg);
    box-shadow: 0 2px 10px rgba(184,134,11,0.4);
    animation: fadeIn 0.6s 0.5s both;
  }

  .sparkle {
    position: absolute;
    border-radius: 50%;
    background: var(--gold);
    opacity: 0;
    pointer-events: none;
    animation: sparklePulse 3.5s ease-in-out infinite;
  }

  .sparkle:nth-child(1) {
    width: 5px;
    height: 5px;
    top: 18%;
    right: 9%;
    animation-delay: 0s;
  }

  .sparkle:nth-child(2) {
    width: 4px;
    height: 4px;
    top: 58%;
    right: 6%;
    animation-delay: 1.3s;
  }

  .sparkle:nth-child(3) {
    width: 3px;
    height: 3px;
    top: 36%;
    left: 7%;
    animation-delay: 2.2s;
  }

  @keyframes sparklePulse {
    0%, 100% {
      opacity: 0;
      transform: scale(0.5) translateY(0);
    }

    50% {
      opacity: 0.5;
      transform: scale(1.3) translateY(-12px);
    }
  }

  .logo {
    text-align: center;
    margin-bottom: clamp(8px, 3vh, 26px);
    animation: fadeDown 0.6s 0.15s both;
  }

  .logo-wrap {
    display: inline-block;
    padding: clamp(6px, 1.5vh, 12px) 22px;
    background: linear-gradient(135deg, rgba(184,134,11,0.07), rgba(184,134,11,0.02));
    border-radius: 16px;
    border: 1px solid rgba(184,134,11,0.14);
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .logo-wrap:hover {
    box-shadow: 0 8px 28px var(--gold-glow);
    transform: translateY(-2px);
  }

  .logo-wrap img {
    height: clamp(30px, 6vh, 44px);
    max-width: 200px;
    display: block;
  }

  .heading {
    text-align: center;
    margin-bottom: clamp(10px, 3vh, 30px);
    animation: fadeDown 0.6s 0.25s both;
  }

  .heading h1 {
    font-size: clamp(20px, 4vh, 30px);
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: clamp(4px, 1vh, 8px);
  }

  .heading h1::after {
    content: '';
    display: block;
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--gold-light));
    border-radius: 2px;
    margin: 8px auto 0;
    transition: width var(--transition);
  }

  .heading:hover h1::after {
    width: 80px;
  }

  .admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, rgba(184,134,11,0.1), rgba(184,134,11,0.05));
    border: 1px solid rgba(184,134,11,0.22);
    border-radius: 50px;
    padding: clamp(3px, 0.8vh, 5px) 14px;
    margin-top: clamp(4px, 1vh, 10px);
  }

  .admin-badge svg {
    color: var(--gold);
    flex-shrink: 0;
  }

  .admin-badge span {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--gold-dark);
    letter-spacing: 0.4px;
  }

  .heading p {
    color: var(--gray-500);
    font-size: clamp(11px, 2vh, 13.5px);
    line-height: 1.5;
    margin-top: clamp(4px, 1vh, 8px);
  }

  form {
    display: grid;
    gap: clamp(10px, 2.2vh, 18px);
    animation: fadeDown 0.6s 0.35s both;
  }

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
    margin-bottom: clamp(3px, 1vh, 7px);
    transition: color var(--transition);
  }

  .input-wrap {
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
    pointer-events: none;
    transition: color var(--transition);
  }

  input {
    width: 100%;
    padding: clamp(10px, 2.2vh, 15px) 16px clamp(10px, 2.2vh, 15px) 48px;
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

  .input-group:focus-within .input-icon {
    color: var(--gold);
  }

  .input-group:focus-within label {
    color: var(--gold);
  }

  .has-toggle input {
    padding-right: 48px;
  }

  .toggle-btn {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--gray-500);
    display: flex;
    align-items: center;
    transition: color var(--transition), transform var(--transition);
  }

  .toggle-btn:hover {
    color: var(--gold);
    transform: translateY(-50%) scale(1.15);
  }

  .btn-submit {
    position: relative;
    border: none;
    cursor: pointer;
    padding: clamp(10px, 2.2vh, 16px);
    border-radius: 50px;
    background: linear-gradient(135deg, var(--gold-dark) 0%, var(--gold) 50%, var(--gold-light) 100%);
    background-size: 200% 200%;
    color: white;
    font-weight: 700;
    font-family: inherit;
    font-size: 15px;
    letter-spacing: 0.4px;
    overflow: hidden;
    margin-top: 4px;
    transition:
      background-position var(--transition),
      box-shadow var(--transition),
      transform var(--transition);
  }

  .btn-submit::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
    transform: skewX(-20deg) translateX(-150%);
    transition: transform 0.65s ease;
  }

  .btn-submit:hover::before {
    transform: skewX(-20deg) translateX(250%);
  }

  .btn-submit:hover {
    background-position: right center;
    box-shadow: 0 10px 30px rgba(184,134,11,0.45), 0 2px 8px rgba(0,0,0,0.15);
    transform: translateY(-2px);
  }

  .btn-submit:active {
    transform: translateY(0);
  }

  .btn-submit:disabled {
    opacity: 0.72;
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
    flex-shrink: 0;
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
    text-align: center;
    font-weight: 600;
    font-size: 13.5px;
    border-radius: 12px;
    padding: 0;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.4s cubic-bezier(0.4,0,0.2,1),
      padding 0.4s cubic-bezier(0.4,0,0.2,1),
      opacity 0.3s ease;
  }

  .message.visible {
    max-height: 80px;
    padding: 11px 14px;
    opacity: 1;
  }

  .message.error {
    color: var(--red);
    background: rgba(220,53,69,0.08);
    border: 1px solid rgba(220,53,69,0.2);
  }

  .message.success {
    color: var(--green);
    background: rgba(25,135,84,0.08);
    border: 1px solid rgba(25,135,84,0.2);
  }

  .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: clamp(2px, 1vh, 4px);
    padding: clamp(6px, 1.5vh, 10px) 14px;
    background: rgba(184,134,11,0.05);
    border: 1px solid rgba(184,134,11,0.12);
    border-radius: 12px;
    animation: fadeDown 0.6s 0.45s both;
  }

  .security-note svg {
    color: var(--gold);
    flex-shrink: 0;
  }

  .security-note span {
    font-size: 12px;
    color: var(--gray-500);
    font-weight: 500;
    line-height: 1.5;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: clamp(10px, 2.5vh, 22px);
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
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: clamp(8px, 2vh, 16px);
    width: 100%;
    color: var(--gray-500);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    padding: clamp(6px, 1.5vh, 10px) 20px;
    border-radius: 50px;
    border: 1.5px solid var(--gray-300);
    transition:
      color var(--transition),
      border-color var(--transition),
      background var(--transition),
      transform var(--transition),
      box-shadow var(--transition);
    animation: fadeDown 0.6s 0.55s both;
  }

  .back-link:hover {
    color: var(--gold);
    border-color: var(--gold);
    background: var(--gold-pale);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--gold-glow);
  }

  .back-link svg {
    transition: transform var(--transition);
  }

  .back-link:hover svg {
    transform: translateX(-3px);
  }

  @keyframes fadeDown {
    from {
      opacity: 0;
      transform: translateY(-18px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
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

  @media (max-width: 520px) {
    .admin-login-page {
      padding: clamp(6px, 2vh, 16px) 12px;
    }

    .admin-card {
      max-height: calc(100vh - 12px);
    }

    .heading h1 {
      font-size: clamp(18px, 4vh, 26px);
    }

    .admin-ribbon {
      display: none;
    }
  }
`;

function getMessageFromError(error) {
  if (!error) return "Admin login failed. Please try again.";
  return error.message || "Admin login failed. Please try again.";
}

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

function saveAdminSession(data) {
  const normalized = normalizeApiData(data) || {};
  const token = normalized.token || normalized.access_token || normalized.admin_token || data?.token || data?.access_token || "";
  const user = normalized.user || normalized.admin || normalized.profile || data?.user || data?.admin || null;

  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  } else if (normalized && Object.keys(normalized).length) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(normalized));
  }

  return { token, user };
}

async function requestAdminLogin(payload) {
  if (typeof apiRequest === "function") {
    return apiRequest("/admin/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  const response = await fetch(`${API_BASE_URL}/admin/login`, {
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
    throw new Error(result.error || validationErrors || result.message || "Admin login failed");
  }

  return result;
}

function IconShield({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg
      className="input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      className="input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ closed = false }) {
  if (closed) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const shakeTimerRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "",
    visible: false,
  });

  const showMessage = useCallback((text, type) => {
    setMessage({
      text,
      type,
      visible: true,
    });
  }, []);

  const hideMessage = useCallback(() => {
    setMessage({
      text: "",
      type: "",
      visible: false,
    });
  }, []);

  const shakeCard = useCallback(() => {
    window.clearTimeout(shakeTimerRef.current);
    setIsShaking(false);

    window.requestAnimationFrame(() => {
      setIsShaking(true);
      shakeTimerRef.current = window.setTimeout(() => {
        setIsShaking(false);
      }, 500);
    });
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      hideMessage();

      setIsSubmitting(true);

      try {
        const result = await requestAdminLogin({
          email: email.trim(),
          password,
        });

        const data = normalizeApiData(result);
        saveAdminSession(data || result);

        showMessage("✓ Login successful — redirecting to dashboard…", "success");

        window.setTimeout(() => {
          navigate("/admin-dashboard");
        }, 600);
      } catch (error) {
        showMessage(getMessageFromError(error), "error");
        shakeCard();
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, hideMessage, navigate, password, shakeCard, showMessage]
  );

  useEffect(() => {
    void adminHeaders;

    return () => {
      window.clearTimeout(shakeTimerRef.current);
    };
  }, []);

  return (
    <>
      <style>{adminLoginStyles}</style>

      <main className="admin-login-page">
        <div className={`admin-card${isShaking ? " shake" : ""}`}>
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />

          <div className="admin-ribbon">Admin</div>

          <div className="admin-card-body">
          <div className="logo">
            <div className="logo-wrap">
              <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
            </div>
          </div>

          <div className="heading">
            <h1>Admin Login</h1>

            <div className="admin-badge">
              <IconShield />
              <span>Super Admin Access Only</span>
            </div>

            <p>Only authorized administrators can access this dashboard.</p>
          </div>

          <form id="adminLoginForm" noValidate onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Admin Email</label>

              <div className="input-wrap">
                <IconMail />
                <input
                  type="email"
                  id="email"
                  placeholder="admin@eliteconventionhall.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Admin Password</label>

              <div className="input-wrap has-toggle">
                <IconLock />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter admin password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  className="toggle-btn"
                  aria-label="Toggle password"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <IconEye closed={showPassword} />
                </button>
              </div>
            </div>

            <div
              className={`message ${message.type} ${message.visible ? "visible" : ""}`.trim()}
              role="alert"
              aria-live="polite"
            >
              {message.text}
            </div>

            <button
              type="submit"
              className={`btn-submit${isSubmitting ? " loading" : ""}`}
              disabled={isSubmitting}
            >
              <div className="btn-inner">
                <div className="spinner" />
                <span className="btn-text">{isSubmitting ? "Logging in..." : "Login as Admin"}</span>
              </div>
            </button>

            <div className="security-note">
              <IconInfo />
              <span>This is a secured admin portal. All access attempts are logged.</span>
            </div>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span>not an admin?</span>
            <div className="divider-line" />
          </div>

          <Link to="/" className="back-link">
            <IconBack />
            Return to Website
          </Link>
          </div>
        </div>
      </main>
    </>
  );
}