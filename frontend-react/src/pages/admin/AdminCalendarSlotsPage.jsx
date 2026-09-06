import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysString(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getStoredAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "available") return "Available";
  if (value === "booked") return "Booked";
  if (value === "blocked") return "Blocked";
  if (value === "payment_in_progress") return "Booking In Progress";
  if (value === "pending_approval") return "Pending Approval";
  return status || "Unknown";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "available") return "slot-available";
  if (value === "booked") return "slot-booked";
  if (value === "blocked") return "slot-blocked";
  if (value === "payment_in_progress") return "slot-progress";
  if (value === "pending_approval") return "slot-pending";
  return "slot-default";
}

function chipClass(status) {
  const v = String(status || "").toLowerCase();
  if (v === "available") return "chip-available";
  if (v === "booked") return "chip-booked";
  if (v === "blocked") return "chip-blocked";
  if (v === "payment_in_progress") return "chip-progress";
  if (v === "pending_approval") return "chip-pending";
  return "chip-default";
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

async function adminApi(path, options = {}) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const headers = {
    Accept: "application/json",
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

/* ── Icons ── */
function IconBars({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconFile({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function IconPlus({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconCalendar({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconEdit({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconLogout({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconRefresh({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}
function IconShield({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconCheck({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconX({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconLock({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconInfo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function IconChevronLeft({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function IconChevronRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IconClose({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

/* ── Styles ── */
const pageStyles = String.raw`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --gold: #b8860b;
    --gold-light: #d4a017;
    --gold-dark: #8f6908;
    --gold-pale: rgba(184,134,11,0.07);
    --gold-glow: rgba(184,134,11,0.22);
    --gold-border: #ead7a6;
    --bg: #faf7f2;
    --white: #ffffff;
    --text: #1a1a2e;
    --muted: #6b7280;
    --red: #dc3545;
    --green: #198754;
    --transition: 0.32s cubic-bezier(0.4,0,0.2,1);
    --shadow-card: 0 4px 24px rgba(0,0,0,0.07);
    --shadow-hover: 0 12px 40px rgba(184,134,11,0.18);
    --radius: 20px;
  }

  body { font-family: 'Poppins', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
  body.slots-layout { overflow-x: hidden; }

  ::-webkit-scrollbar { width: 7px; height: 7px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: rgba(184,134,11,0.3); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--gold); }

  /* ── Sidebar ── */
  .slots-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: 286px;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(18px);
    border-right: 1px solid var(--gold-border);
    box-shadow: 8px 0 32px rgba(0,0,0,0.06);
    z-index: 500; padding: 22px 18px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .slots-sidebar-brand {
    display: flex; align-items: center; gap: 12px;
    text-decoration: none; padding: 8px 8px 18px;
    border-bottom: 1px solid var(--gold-border);
  }
  .slots-sidebar-brand img { width: 154px; max-width: 100%; height: auto; display: block; }
  .slots-sidebar-brand-title { display: block; margin-top: 6px; color: var(--gold-dark); font-size: 13px; font-weight: 800; }
  .slots-admin-card {
    display: flex; align-items: center; gap: 12px; padding: 14px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--gold-pale), rgba(255,255,255,0.9));
    border: 1px solid var(--gold-border);
  }
  .slots-admin-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 13px; font-weight: 700; flex-shrink: 0;
  }
  .slots-admin-label { display: block; color: var(--muted); font-size: 11px; font-weight: 600; margin-bottom: 3px; }
  .slots-admin-name { display: block; color: var(--gold-dark); font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
  .slots-sidebar-menu { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; padding-right: 4px; }
  .slots-sidebar-section-title { margin: 8px 10px 4px; color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.9px; }
  .slots-sidebar-link {
    display: flex; align-items: center; gap: 11px; width: 100%; padding: 12px 14px;
    border-radius: 16px; text-decoration: none; border: 1px solid transparent;
    font-family: inherit; font-size: 14px; font-weight: 700; color: var(--muted);
    background: transparent; transition: all var(--transition);
  }
  .slots-sidebar-link:hover { color: var(--gold-dark); background: var(--gold-pale); border-color: var(--gold-border); transform: translateX(3px); }
  .slots-sidebar-link.active { color: white; background: linear-gradient(135deg, var(--gold-dark), var(--gold)); box-shadow: 0 10px 26px rgba(184,134,11,0.26); border-color: transparent; }
  .slots-sidebar-footer { padding-top: 14px; border-top: 1px solid var(--gold-border); }
  .slots-sidebar-logout {
    display: flex; align-items: center; justify-content: center; gap: 11px;
    width: 100%; padding: 12px 14px; border-radius: 16px; border: none;
    font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
    color: white; background: linear-gradient(135deg, #c0392b, var(--red));
    box-shadow: 0 8px 22px rgba(220,53,69,0.2); transition: all var(--transition);
  }
  .slots-sidebar-logout:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(220,53,69,0.32); }

  /* ── Mobile ── */
  .slots-mobile-topbar {
    display: none; position: sticky; top: 0; z-index: 450; height: 64px;
    background: rgba(255,255,255,0.96); backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--gold-border); padding: 0 16px;
    align-items: center; justify-content: space-between;
    box-shadow: 0 4px 18px rgba(0,0,0,0.05);
  }
  .slots-mobile-topbar img { height: 36px; }
  .slots-sidebar-toggle {
    width: 42px; height: 42px; border-radius: 12px;
    border: 1px solid var(--gold-border); background: var(--gold-pale);
    color: var(--gold-dark); font-size: 22px; cursor: pointer; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
  }
  .slots-sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 480; }
  .slots-sidebar-backdrop.show { display: block; }

  /* ── Layout ── */
  .slots-main { margin-left: 286px; min-height: 100vh; }
  .slots-container { width: 92%; max-width: 1280px; margin: auto; padding: 36px 0 60px; }

  .slots-page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 28px; flex-wrap: wrap; }
  .slots-page-title h1 {
    font-size: 32px; font-weight: 800; letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; line-height: 1.2; margin-bottom: 6px;
  }
  .slots-page-title .muted { font-size: 13.5px; color: var(--muted); font-weight: 400; }

  /* ── Banners ── */
  .slots-banner { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 14px; margin-bottom: 22px; font-size: 13.5px; font-weight: 600; }
  .slots-banner.success { background: rgba(25,135,84,0.08); color: #137333; border: 1px solid #b7e1c1; }
  .slots-banner.error { background: rgba(220,53,69,0.08); color: #b42318; border: 1px solid #f5b5b5; }

  /* ── Section label ── */
  .slots-section-label {
    font-size: 11px; font-weight: 700; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .slots-section-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--gold-border), transparent); }

  /* ── Two col ── */
  .slots-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

  /* ── Panel ── */
  .slots-panel { background: var(--white); border: 1px solid var(--gold-border); border-radius: var(--radius); padding: 28px; box-shadow: var(--shadow-card); transition: box-shadow var(--transition); }
  .slots-panel:hover { box-shadow: var(--shadow-hover); }
  .slots-panel-header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; padding-bottom: 16px; border-bottom: 1px solid rgba(184,134,11,0.12); }
  .slots-panel-icon { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, var(--gold-dark), var(--gold)); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 3px 10px var(--gold-glow); }
  .slots-panel-header h2 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
  .slots-panel-subtitle { font-size: 13px; color: var(--muted); margin: 14px 0 20px; line-height: 1.6; }

  /* ── Form ── */
  .slots-field { margin-bottom: 16px; }
  .slots-label { display: block; font-size: 12px; font-weight: 700; color: var(--gold-dark); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 7px; }
  .slots-input, .slots-select {
    width: 100%; border: 1.5px solid #e0e0e0; border-radius: 12px; padding: 11px 14px;
    font-family: inherit; font-size: 13.5px; color: var(--text); background: var(--bg); outline: none;
    transition: border-color var(--transition), box-shadow var(--transition);
  }
  .slots-input:focus, .slots-select:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-glow); background: var(--white); }

  /* ── Buttons ── */
  .slots-btn-primary {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 12px 20px; margin-top: 6px; border: none; border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white; font-family: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer;
    transition: box-shadow var(--transition), transform var(--transition), opacity var(--transition);
    position: relative; overflow: hidden;
  }
  .slots-btn-primary::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%); transform: skewX(-20deg) translateX(-150%); transition: transform 0.6s ease; }
  .slots-btn-primary:hover::before { transform: skewX(-20deg) translateX(250%); }
  .slots-btn-primary:hover:not(:disabled) { box-shadow: 0 8px 24px var(--gold-glow); transform: translateY(-1px); }
  .slots-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

  /* ── Status badges ── */
  .slot-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 50px; font-size: 11.5px; font-weight: 700; }
  .slot-available { background: rgba(25,135,84,0.1); color: #137333; border: 1px solid #b7e1c1; }
  .slot-booked { background: rgba(180,35,24,0.09); color: #b42318; border: 1px solid #f5b5b5; }
  .slot-blocked { background: rgba(108,114,125,0.1); color: #495057; border: 1px solid #ced4da; }
  .slot-progress { background: rgba(133,90,0,0.1); color: #856404; border: 1px solid #ffe08a; }
  .slot-pending { background: rgba(10,88,202,0.09); color: #0a58ca; border: 1px solid #b6d4fe; }
  .slot-default { background: rgba(108,117,125,0.1); color: #495057; border: 1px solid #dee2e6; }
  .slots-locked-label { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted); font-weight: 600; }

  /* ── Calendar wrapper ── */
  .cal-wrapper {
    background: var(--white); border: 1px solid var(--gold-border);
    border-radius: var(--radius); box-shadow: var(--shadow-card);
    overflow: hidden; transition: box-shadow var(--transition);
  }
  .cal-wrapper:hover { box-shadow: var(--shadow-hover); }

  /* Calendar header */
  .cal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 28px; border-bottom: 1px solid rgba(184,134,11,0.12);
    background: linear-gradient(135deg, rgba(184,134,11,0.05), rgba(184,134,11,0.02));
    flex-wrap: wrap; gap: 14px;
  }
  .cal-header-left { display: flex; align-items: center; gap: 14px; }
  .cal-panel-icon { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, var(--gold-dark), var(--gold)); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 3px 10px var(--gold-glow); }
  .cal-header h2 { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
  .cal-header-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .cal-nav { display: flex; align-items: center; gap: 10px; }
  .cal-nav-btn {
    width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid var(--gold-border);
    background: var(--white); color: var(--gold-dark); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all var(--transition); font-family: inherit;
  }
  .cal-nav-btn:hover { background: var(--gold-pale); border-color: var(--gold); transform: scale(1.05); }
  .cal-month-label { font-size: 17px; font-weight: 800; color: var(--text); min-width: 190px; text-align: center; letter-spacing: -0.3px; }
  .cal-today-btn {
    padding: 8px 16px; border-radius: 10px; border: 1.5px solid var(--gold-border);
    background: var(--white); color: var(--gold-dark); cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 700; transition: all var(--transition);
  }
  .cal-today-btn:hover { background: var(--gold-pale); border-color: var(--gold); }

  /* Legend */
  .cal-legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 12px 28px; border-bottom: 1px solid rgba(184,134,11,0.08); background: var(--bg); }
  .cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--muted); }
  .cal-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .cal-legend-dot.avail { background: #137333; }
  .cal-legend-dot.booked { background: #b42318; }
  .cal-legend-dot.blocked { background: #6b7280; }
  .cal-legend-dot.progress { background: #856404; }
  .cal-legend-dot.pending { background: #0a58ca; }

  /* Summary strip */
  .cal-summary-strip { display: flex; border-bottom: 1px solid rgba(184,134,11,0.1); }
  .cal-summary-item { flex: 1; padding: 12px 8px; text-align: center; border-right: 1px solid rgba(184,134,11,0.08); }
  .cal-summary-item:last-child { border-right: none; }
  .cal-summary-val { font-size: 20px; font-weight: 800; color: var(--text); line-height: 1; }
  .cal-summary-lbl { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 3px; }
  .cal-summary-item.s-avail .cal-summary-val { color: #137333; }
  .cal-summary-item.s-booked .cal-summary-val { color: #b42318; }
  .cal-summary-item.s-blocked .cal-summary-val { color: #6b7280; }
  .cal-summary-item.s-progress .cal-summary-val { color: #856404; }
  .cal-summary-item.s-pending .cal-summary-val { color: #0a58ca; }

  /* Day name headers */
  .cal-day-headers { display: grid; grid-template-columns: repeat(7, 1fr); background: linear-gradient(135deg, rgba(184,134,11,0.06), rgba(184,134,11,0.02)); border-bottom: 1px solid rgba(184,134,11,0.12); }
  .cal-day-header { padding: 12px 4px; text-align: center; font-size: 11px; font-weight: 800; color: var(--gold-dark); text-transform: uppercase; letter-spacing: 0.7px; }

  /* ── Calendar grid cells ── */
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); position: relative; }

  /* Base cell — future/today dates */
  .cal-cell {
    min-height: 110px; padding: 10px 8px 8px;
    border-right: 1px solid rgba(234,215,166,0.4);
    border-bottom: 1px solid rgba(234,215,166,0.4);
    position: relative; cursor: pointer;
    transition: background var(--transition);
    background: var(--white);
  }
  .cal-cell:nth-child(7n) { border-right: none; }
  .cal-cell:hover { background: rgba(184,134,11,0.035); }

  /* Empty filler cells (before day 1) */
  .cal-cell-empty {
    background: rgba(250,247,242,0.5);
    cursor: default;
    min-height: 110px;
    border-right: 1px solid rgba(234,215,166,0.4);
    border-bottom: 1px solid rgba(234,215,166,0.4);
  }
  .cal-cell-empty:nth-child(7n) { border-right: none; }

  /* ── PAST DAY CELL — only shows the greyed date number, nothing else ── */
  .cal-cell-past {
    min-height: 110px; padding: 10px 8px 8px;
    border-right: 1px solid rgba(234,215,166,0.4);
    border-bottom: 1px solid rgba(234,215,166,0.4);
    background: repeating-linear-gradient(
      -45deg,
      rgba(0,0,0,0.012),
      rgba(0,0,0,0.012) 2px,
      transparent 2px,
      transparent 10px
    );
    cursor: not-allowed;
    position: relative;
  }
  .cal-cell-past:nth-child(7n) { border-right: none; }

  /* Today highlight */
  .cal-cell-today { background: rgba(184,134,11,0.06); }
  .cal-cell-today::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--gold-dark), var(--gold)); }

  /* Selected cell */
  .cal-cell-selected { background: rgba(184,134,11,0.1); outline: 2px solid var(--gold); outline-offset: -2px; }

  /* Date number */
  .cal-date-num {
    font-size: 13px; font-weight: 700; color: var(--text);
    width: 26px; height: 26px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 6px; transition: all var(--transition);
  }
  .cal-cell-today .cal-date-num { background: linear-gradient(135deg, var(--gold-dark), var(--gold)); color: white; box-shadow: 0 3px 8px var(--gold-glow); }

  /* Past date number — muted */
  .cal-date-num-past {
    font-size: 13px; font-weight: 500;
    color: rgba(107,114,128,0.45);
    width: 26px; height: 26px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 0;
  }

  /* Slot chips */
  .cal-slots-list { display: flex; flex-direction: column; gap: 3px; }
  .cal-slot-chip {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 7px; border-radius: 6px;
    font-size: 10.5px; font-weight: 700; cursor: pointer;
    transition: transform var(--transition), filter var(--transition);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    border: 1px solid transparent;
  }
  .cal-slot-chip:hover { transform: scale(1.03); filter: brightness(0.94); }
  .cal-slot-chip.chip-available { background: rgba(25,135,84,0.12); color: #137333; border-color: #b7e1c1; }
  .cal-slot-chip.chip-booked { background: rgba(180,35,24,0.1); color: #b42318; border-color: #f5b5b5; }
  .cal-slot-chip.chip-blocked { background: rgba(108,114,125,0.1); color: #495057; border-color: #ced4da; }
  .cal-slot-chip.chip-progress { background: rgba(133,90,0,0.1); color: #856404; border-color: #ffe08a; }
  .cal-slot-chip.chip-pending { background: rgba(10,88,202,0.09); color: #0a58ca; border-color: #b6d4fe; }
  .cal-slot-chip.chip-default { background: rgba(108,117,125,0.1); color: #495057; border-color: #dee2e6; }

  .cal-chip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .chip-available .cal-chip-dot { background: #137333; }
  .chip-booked .cal-chip-dot { background: #b42318; }
  .chip-blocked .cal-chip-dot { background: #6b7280; }
  .chip-progress .cal-chip-dot { background: #856404; }
  .chip-pending .cal-chip-dot { background: #0a58ca; }
  .chip-default .cal-chip-dot { background: #495057; }

  .cal-more-chips { font-size: 10px; color: var(--muted); font-weight: 600; margin-top: 2px; padding: 0 4px; }
  .cal-empty-day { font-size: 10.5px; color: rgba(107,114,128,0.4); font-style: italic; padding: 0 2px; }

  /* Loading overlay */
  .cal-loading-overlay {
    position: absolute; inset: 0; background: rgba(250,247,242,0.82);
    display: flex; align-items: center; justify-content: center; z-index: 5;
  }
  .cal-spinner { width: 32px; height: 32px; border: 3px solid var(--gold-border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Day detail modal ── */
  .cal-modal-backdrop {
    position: fixed; inset: 0; background: rgba(26,26,46,0.45);
    backdrop-filter: blur(4px); z-index: 900;
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .cal-modal {
    background: var(--white); border-radius: 24px;
    border: 1px solid var(--gold-border);
    box-shadow: 0 24px 80px rgba(0,0,0,0.18);
    width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
    animation: modalIn 0.25s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.94) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }

  .cal-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 24px 18px; border-bottom: 1px solid rgba(184,134,11,0.12);
    position: sticky; top: 0; background: var(--white); z-index: 2;
    border-radius: 24px 24px 0 0;
  }
  .cal-modal-date { font-size: 18px; font-weight: 800; color: var(--text); }
  .cal-modal-day { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
  .cal-modal-close {
    width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid var(--gold-border);
    background: var(--bg); color: var(--muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all var(--transition); flex-shrink: 0;
  }
  .cal-modal-close:hover { background: #fde8e8; border-color: #f5b5b5; color: #b42318; }
  .cal-modal-body { padding: 20px 24px 24px; }

  .cal-modal-slot {
    border: 1px solid var(--gold-border); border-radius: 16px;
    padding: 16px 18px; margin-bottom: 12px;
    background: var(--bg); transition: box-shadow var(--transition);
  }
  .cal-modal-slot:last-child { margin-bottom: 0; }
  .cal-modal-slot:hover { box-shadow: 0 4px 16px rgba(184,134,11,0.12); }
  .cal-modal-slot-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .cal-modal-shift { font-size: 14px; font-weight: 700; color: var(--text); }
  .cal-modal-time { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .cal-modal-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .cal-modal-action-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 10px; border: none;
    font-family: inherit; font-weight: 700; font-size: 12.5px; cursor: pointer;
    transition: all var(--transition);
  }
  .cal-modal-action-btn.green { background: rgba(25,135,84,0.1); color: #137333; border: 1px solid #b7e1c1; }
  .cal-modal-action-btn.green:hover:not(:disabled) { background: rgba(25,135,84,0.2); transform: translateY(-1px); }
  .cal-modal-action-btn.red { background: rgba(220,53,69,0.08); color: #b42318; border: 1px solid #f5b5b5; }
  .cal-modal-action-btn.red:hover:not(:disabled) { background: rgba(220,53,69,0.16); transform: translateY(-1px); }
  .cal-modal-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cal-modal-locked { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); font-weight: 600; padding: 8px 14px; border-radius: 10px; background: rgba(107,114,128,0.07); border: 1px solid #e0e0e0; }

  /* ── Responsive ── */
  @media (max-width: 980px) {
    .slots-sidebar { transform: translateX(-105%); transition: transform var(--transition); }
    .slots-sidebar.open { transform: translateX(0); }
    .slots-main { margin-left: 0; }
    .slots-mobile-topbar { display: flex; }
  }
  @media (max-width: 860px) {
    .slots-two-col { grid-template-columns: 1fr; }
    .cal-cell, .cal-cell-past, .cal-cell-empty { min-height: 80px; padding: 7px 4px 6px; }
    .cal-header { padding: 16px 18px; }
    .cal-legend { padding: 10px 18px; }
    .cal-month-label { min-width: 140px; font-size: 14px; }
  }
  @media (max-width: 560px) {
    .slots-page-title h1 { font-size: 26px; }
    .slots-container { padding: 20px 0 40px; }
    .cal-cell, .cal-cell-past, .cal-cell-empty { min-height: 60px; padding: 5px 3px 4px; }
    .cal-date-num, .cal-date-num-past { font-size: 11px; width: 22px; height: 22px; }
    .cal-slot-chip { font-size: 9px; padding: 2px 5px; }
    .cal-summary-val { font-size: 16px; }
    .cal-summary-lbl { font-size: 9px; }
  }
`;

/* ── Day Detail Modal ── */
function DayModal({ dateStr, slots, onClose, onUpdate, savingStatus }) {
  const d = new Date(dateStr + "T00:00:00");
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="cal-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cal-modal" role="dialog" aria-modal="true">
        <div className="cal-modal-header">
          <div>
            <div className="cal-modal-date">{formattedDate}</div>
            <div className="cal-modal-day">{dayName}</div>
          </div>
          <button className="cal-modal-close" type="button" onClick={onClose} aria-label="Close">
            <IconClose size={15} />
          </button>
        </div>

        <div className="cal-modal-body">
          {slots.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic", padding: "24px 0", fontSize: "13.5px" }}>
              No slots found for this date.
            </p>
          ) : (
            slots.map((slot) => {
              const status = String(slot.slot_status || "").toLowerCase();
              const isLocked =
                status === "booked" ||
                status === "payment_in_progress" ||
                status === "pending_approval";
              const isBlocked = status === "blocked";
              const isAvailable = status === "available";

              return (
                <div className="cal-modal-slot" key={slot.id || slot.shift_id}>
                  <div className="cal-modal-slot-top">
                    <div>
                      <div className="cal-modal-shift">
                        {slot.shift_name || `Shift #${slot.shift_id}`}
                      </div>
                      {slot.start_time && slot.end_time && (
                        <div className="cal-modal-time">
                          {slot.start_time} – {slot.end_time}
                        </div>
                      )}
                    </div>
                    <span className={`slot-badge ${statusClass(status)}`}>
                      {formatStatus(status)}
                    </span>
                  </div>

                  <div className="cal-modal-actions">
                    {isLocked ? (
                      <span className="cal-modal-locked">
                        <IconLock size={12} /> Locked — cannot be changed
                      </span>
                    ) : isBlocked ? (
                      <button
                        className="cal-modal-action-btn green"
                        type="button"
                        disabled={savingStatus}
                        onClick={() => onUpdate(slot, "available")}
                      >
                        <IconCheck size={12} /> Make Available
                      </button>
                    ) : isAvailable ? (
                      <button
                        className="cal-modal-action-btn red"
                        type="button"
                        disabled={savingStatus}
                        onClick={() => onUpdate(slot, "blocked")}
                      >
                        <IconX size={12} /> Block This Slot
                      </button>
                    ) : (
                      <span className="cal-modal-locked">No actions available</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Calendar View ── */
function CalendarView({ slots, loading, savingStatus, onQuickUpdate }) {
  const today = new Date();
  const todayStr = todayString(); // "YYYY-MM-DD"

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  /* Build date → slot[] map, but ONLY for today-and-future dates */
  const slotsByDate = useMemo(() => {
    const map = {};
    slots.forEach((slot) => {
      const d = slot.slot_date;
      // ── FRONTEND GUARD: silently drop any past-date slots from the map ──
      if (d < todayStr) return;
      if (!map[d]) map[d] = [];
      map[d].push(slot);
    });
    return map;
  }, [slots, todayStr]);

  /* Month summary — only future/today slots count */
  const calSummary = useMemo(() => {
    const acc = { available: 0, booked: 0, blocked: 0, paymentInProgress: 0, pendingApproval: 0 };
    const prefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
    Object.entries(slotsByDate).forEach(([date, daySlots]) => {
      if (!date.startsWith(prefix)) return;
      daySlots.forEach((s) => {
        const st = String(s.slot_status || "").toLowerCase();
        if (st === "available") acc.available++;
        else if (st === "booked") acc.booked++;
        else if (st === "blocked") acc.blocked++;
        else if (st === "payment_in_progress") acc.paymentInProgress++;
        else if (st === "pending_approval") acc.pendingApproval++;
      });
    });
    return acc;
  }, [slotsByDate, calYear, calMonth]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
    setSelectedDate(null);
  }
  function goToday() {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setSelectedDate(null);
  }

  async function handleModalUpdate(slot, newStatus) {
    const confirmed = window.confirm(
      `Mark "${slot.shift_name || "this shift"}" on ${slot.slot_date} as ${newStatus}?`
    );
    if (!confirmed) return;
    await onQuickUpdate(slot, newStatus);
  }

  /* Build cell descriptors */
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ type: "empty", key: `empty-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    // ── Classify each day ──
    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    cells.push({ type: "day", day: d, dateStr, isPast, isToday });
  }

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  const CHIP_LIMIT = 3;

  return (
    <>
      <div className="cal-wrapper" style={{ position: "relative" }}>

        {/* Header */}
        <div className="cal-header">
          <div className="cal-header-left">
            <div className="cal-panel-icon">
              <IconCalendar size={16} />
            </div>
            <div>
              <h2>View &amp; Manage Slots</h2>
              <div className="cal-header-sub">
                Click any current or future date to view shifts and take actions
              </div>
            </div>
          </div>

          <div className="cal-nav">
            <button className="cal-today-btn" type="button" onClick={goToday}>Today</button>
            <button className="cal-nav-btn" type="button" onClick={prevMonth} aria-label="Previous month">
              <IconChevronLeft size={15} />
            </button>
            <span className="cal-month-label">{MONTH_NAMES[calMonth]} {calYear}</span>
            <button className="cal-nav-btn" type="button" onClick={nextMonth} aria-label="Next month">
              <IconChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="cal-legend">
          <div className="cal-legend-item"><span className="cal-legend-dot avail" />Available</div>
          <div className="cal-legend-item"><span className="cal-legend-dot booked" />Booked</div>
          <div className="cal-legend-item"><span className="cal-legend-dot blocked" />Blocked</div>
          <div className="cal-legend-item"><span className="cal-legend-dot progress" />In Progress</div>
          <div className="cal-legend-item"><span className="cal-legend-dot pending" />Pending Approval</div>
          {/* ── Visual cue for past days ── */}
          <div className="cal-legend-item" style={{ marginLeft: "auto" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "repeating-linear-gradient(-45deg,rgba(0,0,0,0.12),rgba(0,0,0,0.12) 1px,transparent 1px,transparent 4px)", display: "inline-block", flexShrink: 0 }} />
            Past (read-only)
          </div>
        </div>

        {/* Month summary */}
        <div className="cal-summary-strip">
          <div className="cal-summary-item s-avail">
            <div className="cal-summary-val">{calSummary.available}</div>
            <div className="cal-summary-lbl">Available</div>
          </div>
          <div className="cal-summary-item s-booked">
            <div className="cal-summary-val">{calSummary.booked}</div>
            <div className="cal-summary-lbl">Booked</div>
          </div>
          <div className="cal-summary-item s-blocked">
            <div className="cal-summary-val">{calSummary.blocked}</div>
            <div className="cal-summary-lbl">Blocked</div>
          </div>
          <div className="cal-summary-item s-progress">
            <div className="cal-summary-val">{calSummary.paymentInProgress}</div>
            <div className="cal-summary-lbl">In Progress</div>
          </div>
          <div className="cal-summary-item s-pending">
            <div className="cal-summary-val">{calSummary.pendingApproval}</div>
            <div className="cal-summary-lbl">Pending</div>
          </div>
        </div>

        {/* Day headers */}
        <div className="cal-day-headers">
          {DAY_NAMES.map((d) => (
            <div className="cal-day-header" key={d}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="cal-grid">
          {loading && (
            <div className="cal-loading-overlay">
              <div className="cal-spinner" />
            </div>
          )}

          {cells.map((cell) => {

            /* ── Empty filler ── */
            if (cell.type === "empty") {
              return <div className="cal-cell-empty" key={cell.key} />;
            }

            const { dateStr, day, isPast, isToday } = cell;

            /* ── PAST DAY — render a locked, non-interactive cell ── */
            if (isPast) {
              return (
                <div
                  key={dateStr}
                  className="cal-cell-past"
                  title="Past date — read only"
                >
                  {/* Only the date number, muted, no chips, no hover action */}
                  <div className="cal-date-num-past">{day}</div>
                  {/* Nothing else rendered for past days */}
                </div>
              );
            }

            /* ── TODAY or FUTURE — fully interactive ── */
            const daySlots = slotsByDate[dateStr] || [];
            const isSelected = dateStr === selectedDate;
            const visibleSlots = daySlots.slice(0, CHIP_LIMIT);
            const extraCount = daySlots.length - CHIP_LIMIT;

            let cellCls = "cal-cell";
            if (isToday) cellCls += " cal-cell-today";
            if (isSelected) cellCls += " cal-cell-selected";

            return (
              <div
                key={dateStr}
                className={cellCls}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                title={`${dateStr} — ${daySlots.length} shift(s). Click to manage.`}
              >
                <div className="cal-date-num">{day}</div>

                <div className="cal-slots-list">
                  {daySlots.length === 0 ? (
                    <span className="cal-empty-day">No slots</span>
                  ) : (
                    <>
                      {visibleSlots.map((slot) => {
                        const st = String(slot.slot_status || "").toLowerCase();
                        return (
                          <div
                            key={slot.id || slot.shift_id}
                            className={`cal-slot-chip ${chipClass(st)}`}
                            title={`${slot.shift_name || "Shift"}: ${formatStatus(st)}`}
                          >
                            <span className="cal-chip-dot" />
                            {slot.shift_name || `S#${slot.shift_id}`}
                          </div>
                        );
                      })}
                      {extraCount > 0 && (
                        <div className="cal-more-chips">+{extraCount} more</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal — only ever opened for today/future dates */}
      {selectedDate && (
        <DayModal
          dateStr={selectedDate}
          slots={selectedSlots}
          onClose={() => setSelectedDate(null)}
          onUpdate={handleModalUpdate}
          savingStatus={savingStatus}
        />
      )}
    </>
  );
}

/* ── Main Page ── */
export default function AdminCalendarSlotsPage() {
  const navigate = useNavigate();

  const [admin] = useState(() => getStoredAdmin() || {});

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [shifts, setShifts] = useState([]);
  const [slots, setSlots] = useState([]);

  const [untilDate, setUntilDate] = useState(addDaysString(365));
  const [manualDate, setManualDate] = useState(todayString());
  const [manualShiftId, setManualShiftId] = useState("");
  const [manualStatus, setManualStatus] = useState("blocked");

  const adminName = admin?.name || "Admin";

  /* ── BACKEND GUARD: start_date is always today — never request past dates ── */
async function loadSlots() {
  setLoading(true);
  setError("");
  setMessage("");
  try {
    const start = todayString();
    const end = "2099-12-31"; // ← always fetch everything the server has

    const query = new URLSearchParams({
      start_date: start,
      end_date: end,
    });

    const data = await adminApi(
      `/admin/calendar-slots?${query.toString()}`,
      { method: "GET" }
    );
    setSlots(data?.data?.slots || []);
  } catch (err) {
    if (String(err.message || "").toLowerCase().includes("unauthenticated")) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      navigate("/admin-login");
      return;
    }
    setError(err.message || "Failed to load calendar slots.");
  } finally {
    setLoading(false);
  }
}

  async function loadBookingContext() {
    const data = await adminApi("/booking-context", { method: "GET" });
    const context = data?.data || data || {};
    const loadedShifts = Array.isArray(context.shifts) ? context.shifts : [];
    setShifts(loadedShifts);
    if (loadedShifts.length > 0 && !manualShiftId) {
      setManualShiftId(String(loadedShifts[0].id));
    }
  }

  async function generateUntil() {
    const confirmed = window.confirm(
      `This will create/update all slots from today until ${untilDate}.\nAlready booked slots will remain booked.\n\nContinue?`
    );
    if (!confirmed) return;
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const data = await adminApi("/admin/calendar-slots/generate-until", {
        method: "POST",
        body: JSON.stringify({ until_date: untilDate }),
      });
      const result = data?.data || {};
      setMessage(
        `Done — Created new available slots: ${result.created || 0} · Existing available refreshed: ${result.updated_to_available || 0} · Protected unchanged slots: ${result.kept_locked ?? result.kept_booked ?? 0}`
      );
      await loadSlots();
    } catch (err) {
      setError(err.message || "Failed to generate slots.");
    } finally {
      setGenerating(false);
    }
  }

  async function updateManualStatus() {
    if (!manualDate || !manualShiftId || !manualStatus) {
      setError("Please select date, shift and status.");
      return;
    }
    /* ── FRONTEND GUARD: block manual update for past dates ── */
    if (manualDate < todayString()) {
      setError("You cannot modify slots for past dates.");
      return;
    }
    setSavingStatus(true);
    setError("");
    setMessage("");
    try {
      const data = await adminApi("/admin/calendar-slots/status", {
        method: "PATCH",
        body: JSON.stringify({
          slot_date: manualDate,
          shift_id: Number(manualShiftId),
          slot_status: manualStatus,
        }),
      });
      setMessage(data?.message || "Slot status updated successfully.");
      await loadSlots();
    } catch (err) {
      setError(err.message || "Failed to update slot status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function quickUpdateSlot(slot, newStatus) {
    /* ── FRONTEND GUARD: should never be called for past dates
         (modal never opens for them), but double-check anyway ── */
    if (slot.slot_date < todayString()) {
      setError("You cannot modify slots for past dates.");
      return;
    }
    setSavingStatus(true);
    setError("");
    setMessage("");
    try {
      const data = await adminApi("/admin/calendar-slots/status", {
        method: "PATCH",
        body: JSON.stringify({
          slot_date: slot.slot_date,
          shift_id: Number(slot.shift_id),
          slot_status: newStatus,
        }),
      });
      setMessage(data?.message || "Slot status updated successfully.");
      await loadSlots();
    } catch (err) {
      setError(err.message || "Failed to update slot status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function logoutAdmin() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await adminApi("/admin/logout", { method: "POST", body: JSON.stringify({}) });
    } catch { /* ignore */ } finally {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setIsLoggingOut(false);
      navigate("/admin-login");
    }
  }

  useEffect(() => {
    document.body.classList.add("slots-layout");
    return () => document.body.classList.remove("slots-layout");
  }, []);

  useEffect(() => {
    loadBookingContext().catch(() => setError("Failed to load shift information."));
    loadSlots();
  }, []);

  return (
    <>
      <style>{pageStyles}</style>

      {/* Sidebar */}
      <Sidebar admin={admin} />

      <main className="slots-main">
        <div className="slots-mobile-topbar">
          <button className="slots-sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)}>☰</button>
          <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
        </div>

        <div className="slots-container">
          <div className="slots-page-header">
            <div className="slots-page-title">
              <h1>Calendar Slot Management</h1>
              <p className="muted">
                Generate available slots, block specific dates, and protect booked/payment/pending/blocked slots.
              </p>
            </div>
          </div>

          {message && (
            <div className="slots-banner success">
              <IconCheck size={16} /><span>{message}</span>
            </div>
          )}
          {error && (
            <div className="slots-banner error">
              <IconInfo size={16} /><span>{error}</span>
            </div>
          )}

          <p className="slots-section-label">Slot Configuration</p>

          <div className="slots-two-col">
            {/* Generate panel */}
            <div className="slots-panel">
              <div className="slots-panel-header">
                <div className="slots-panel-icon"><IconRefresh size={16} /></div>
                <h2>Generate Available Slots</h2>
              </div>
              <p className="slots-panel-subtitle">
                Select a target date. All slots from today until that date will be marked
                available. Slots that are already booked will remain unchanged.
              </p>
              <div className="slots-field">
                <label className="slots-label">Available Until Date</label>
                <input
                  className="slots-input"
                  type="date"
                  value={untilDate}
                  min={todayString()}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              </div>
              <button
                className="slots-btn-primary"
                type="button"
                disabled={generating}
                onClick={generateUntil}
              >
                <IconRefresh size={14} />
                {generating ? "Updating…" : "Generate / Update Slots"}
              </button>
            </div>

            {/* Manual panel */}
            <div className="slots-panel">
              <div className="slots-panel-header">
                <div className="slots-panel-icon"><IconShield size={16} /></div>
                <h2>Manual Slot Status</h2>
              </div>
              <p className="slots-panel-subtitle">
                Override a specific date and shift. You can block or unblock any slot.
                Booked slots are protected and cannot be changed.
              </p>
              <div className="slots-field">
                <label className="slots-label">Date</label>
                {/* min={todayString()} prevents picking a past date from the date-picker UI */}
                <input
                  className="slots-input"
                  type="date"
                  value={manualDate}
                  min={todayString()}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>
              <div className="slots-field">
                <label className="slots-label">Shift</label>
                <select
                  className="slots-select"
                  value={manualShiftId}
                  onChange={(e) => setManualShiftId(e.target.value)}
                >
                  {shifts.length === 0 && <option value="">Loading shifts…</option>}
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                      {shift.start_time && shift.end_time
                        ? ` (${shift.start_time} – ${shift.end_time})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="slots-field">
                <label className="slots-label">Status</label>
                <select
                  className="slots-select"
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                >
                  <option value="blocked">Blocked</option>
                  <option value="available">Available</option>
                </select>
              </div>
              <button
                className="slots-btn-primary"
                type="button"
                disabled={savingStatus}
                onClick={updateManualStatus}
              >
                <IconShield size={14} />
                {savingStatus ? "Saving…" : "Update Slot Status"}
              </button>
            </div>
          </div>

          <p className="slots-section-label">Slot Overview</p>

          <CalendarView
            slots={slots}
            loading={loading}
            savingStatus={savingStatus}
            onQuickUpdate={quickUpdateSlot}
          />
        </div>
      </main>
    </>
  );
}