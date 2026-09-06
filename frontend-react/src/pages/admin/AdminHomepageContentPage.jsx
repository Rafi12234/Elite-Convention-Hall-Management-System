import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

const emptyContent = {
  nav: {
    logo: "/assets/img/ECH-02.png",
    logo_alt: "Elite Convention Hall Logo",
    links: [],
    booking_button_text: "Book Now",
    booking_button_link: "#calendar-booking",
    login_text: "Login",
    admin_login_text: "Admin Login",
    logout_text: "Logout",
  },
  hero: {
    title: "",
    highlight: "",
    subtitle: "",
    background_image: "",
    primary_button_text: "",
    primary_button_link: "",
    secondary_button_text: "",
    secondary_button_link: "",
  },
  stats: [],
  calendar_section: {
    eyebrow: "",
    title: "",
    description: "",
    loading_text: "",
    button_today: "",
    button_month: "",
    button_year_view: "",
    legend: [],
  },
  our_story: {
    eyebrow: "",
    title: "",
    description: "",
  },
  creating_experiences: {
    image: "",
    image_alt: "",
    badge_text: "",
    eyebrow: "",
    title: "",
    description_1: "",
    description_2: "",
    points: [],
    button_text: "",
    button_link: "",
  },
  gallery: {
    eyebrow: "",
    title: "",
    description: "",
    empty_text: "",
    images: [],
  },
  features_section: {
    eyebrow: "",
    title: "",
    description: "",
    cards: [],
  },
  booking_cta: {
    background_image: "",
    title: "",
    highlight: "",
    title_suffix: "",
    description: "",
    primary_button_text: "",
    primary_button_link: "",
    secondary_button_text: "",
    secondary_button_link: "",
  },
  footer: {
    logo: "/assets/img/ECH-02.png",
    logo_alt: "Elite Convention Hall",
    description: "",
    quick_links_title: "Quick Links",
    quick_links: [],
    contact_title: "Contact",
    address: "",
    phone: "",
    email: "",
    copyright: "",
    copyright_brand: "Elite Convention Hall",
    tagline: "",
  },
};

const adminHomepageStyles = String.raw`
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

  ::-webkit-scrollbar { width: 7px; height: 7px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: rgba(184,134,11,0.3); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--gold); }

  body {
    font-family: 'Poppins', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  body.admin-layout { overflow-x: hidden; }

  /* ── SIDEBAR (unchanged) ── */
  .admin-sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: 286px;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-right: 1px solid var(--gold-border);
    box-shadow: 8px 0 32px rgba(0,0,0,0.06);
    z-index: 500;
    padding: 22px 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .sidebar-brand {
    display: flex; align-items: center; gap: 12px;
    text-decoration: none;
    padding: 8px 8px 18px;
    border-bottom: 1px solid var(--gold-border);
  }
  .sidebar-brand img { width: 154px; max-width: 100%; height: auto; display: block; }
  .sidebar-title { display: block; margin-top: 6px; color: var(--gold-dark); font-size: 13px; font-weight: 800; letter-spacing: 0.3px; }
  .sidebar-admin-card {
    display: flex; align-items: center; gap: 12px;
    padding: 14px; border-radius: 18px;
    background: linear-gradient(135deg, var(--gold-pale), rgba(255,255,255,0.9));
    border: 1px solid var(--gold-border);
  }
  .admin-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 14px; font-weight: 800; flex-shrink: 0;
  }
  .sidebar-admin-meta { min-width: 0; }
  .sidebar-admin-label { display: block; color: var(--muted); font-size: 11px; font-weight: 600; margin-bottom: 3px; }
  .sidebar-admin-name { display: block; color: var(--gold-dark); font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
  .sidebar-menu { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; padding-right: 4px; }
  .sidebar-section-title { margin: 8px 10px 4px; color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.9px; }
  .sidebar-link, .sidebar-logout {
    display: flex; align-items: center; gap: 11px;
    width: 100%; padding: 12px 14px; border-radius: 16px;
    text-decoration: none; border: 1px solid transparent;
    font-family: inherit; font-size: 14px; font-weight: 700;
    transition: all var(--transition);
  }
  .sidebar-link { color: var(--muted); background: transparent; }
  .sidebar-link svg, .sidebar-logout svg { flex-shrink: 0; }
  .sidebar-link:hover { color: var(--gold-dark); background: var(--gold-pale); border-color: var(--gold-border); transform: translateX(3px); }
  .sidebar-link.active { color: white; background: linear-gradient(135deg, var(--gold-dark), var(--gold)); box-shadow: 0 10px 26px rgba(184,134,11,0.26); }
  .sidebar-footer { padding-top: 14px; border-top: 1px solid var(--gold-border); }
  .sidebar-logout { cursor: pointer; justify-content: center; color: white; background: linear-gradient(135deg, #c0392b, var(--red)); box-shadow: 0 8px 22px rgba(220,53,69,0.2); }
  .sidebar-logout:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(220,53,69,0.32); }

  /* ── MAIN LAYOUT ── */
  .admin-main { margin-left: 286px; min-height: 100vh; transition: margin-left var(--transition); }
  .admin-mobile-topbar {
    display: none; position: sticky; top: 0; z-index: 450;
    height: 64px; background: rgba(255,255,255,0.96);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--gold-border);
    padding: 0 16px; align-items: center; justify-content: space-between;
    box-shadow: 0 4px 18px rgba(0,0,0,0.05);
  }
  .sidebar-toggle { width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--gold-border); background: var(--gold-pale); color: var(--gold-dark); font-size: 22px; cursor: pointer; font-weight: 800; }
  .admin-mobile-topbar img { height: 36px; }
  .sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 480; }
  .sidebar-backdrop.show { display: block; }

  /* ── REDESIGNED MAIN CONTENT ── */
  .hce-container {
    width: 94%;
    max-width: 1380px;
    margin: 0 auto;
    padding: 40px 0 80px;
  }

  /* ── HERO HEADER ── */
  .hce-page-hero {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    background: linear-gradient(135deg, #1a1208 0%, #2d1f04 40%, #3d2a06 70%, #1a1208 100%);
    padding: 44px 48px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    animation: hceSlideDown 0.6s cubic-bezier(0.22,1,0.36,1) both;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(184,134,11,0.3);
  }

  .hce-page-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(ellipse 60% 80% at 80% 50%, rgba(184,134,11,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 40% 60% at 10% 80%, rgba(184,134,11,0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .hce-page-hero::after {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 260px; height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(184,134,11,0.14) 0%, transparent 70%);
    pointer-events: none;
  }

  .hce-hero-left { position: relative; z-index: 1; }

  .hce-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 14px;
    background: rgba(184,134,11,0.18);
    border: 1px solid rgba(184,134,11,0.4);
    border-radius: 999px;
    color: #f0c060;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 16px;
    backdrop-filter: blur(8px);
  }

  .hce-hero-badge span {
    width: 6px; height: 6px;
    background: #f0c060;
    border-radius: 50%;
    box-shadow: 0 0 8px #f0c060;
    animation: hcePulse 2s ease-in-out infinite;
    display: inline-block;
    flex-shrink: 0;
  }

  .hce-page-hero h1 {
    font-size: 36px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    line-height: 1.15;
    margin-bottom: 10px;
  }

  .hce-page-hero h1 em {
    font-style: normal;
    background: linear-gradient(90deg, #f0c060, #d4a017, #b8860b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hce-page-hero p {
    color: rgba(255,255,255,0.6);
    font-size: 14px;
    font-weight: 400;
    max-width: 480px;
    line-height: 1.7;
  }

  .hce-hero-actions {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  /* ── BUTTONS ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 20px;
    border: none;
    border-radius: 14px;
    font-family: inherit;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
    position: relative;
    overflow: hidden;
    white-space: nowrap;
  }

  .btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  .btn:hover::after { opacity: 1; }

  .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

  .btn-primary {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light));
    color: white;
    box-shadow: 0 6px 20px rgba(184,134,11,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(184,134,11,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }

  .btn-secondary {
    background: rgba(255,255,255,0.92);
    border: 1.5px solid var(--gold-border);
    color: var(--gold-dark);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .btn-secondary:hover:not(:disabled) {
    transform: translateY(-2px);
    background: white;
    border-color: var(--gold);
    box-shadow: 0 8px 24px rgba(184,134,11,0.18);
    color: var(--gold-dark);
  }

  .btn-danger {
    background: rgba(220,53,69,0.08);
    color: #c0392b;
    border: 1.5px solid rgba(220,53,69,0.2);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    background: rgba(220,53,69,0.14);
    border-color: rgba(220,53,69,0.35);
    box-shadow: 0 4px 14px rgba(220,53,69,0.18);
  }

  .btn-ghost {
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.22);
    color: rgba(255,255,255,0.85);
  }
  .btn-ghost:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.4);
    transform: translateY(-2px);
  }

  .btn-sm { padding: 8px 14px; font-size: 12.5px; border-radius: 10px; }

  /* ── MESSAGE BANNER ── */
  .hce-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 20px;
    border-radius: 16px;
    margin-bottom: 24px;
    font-size: 13.5px;
    font-weight: 500;
    animation: hceSlideDown 0.4s cubic-bezier(0.22,1,0.36,1) both;
    position: relative;
    overflow: hidden;
  }

  .hce-message::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 4px 0 0 4px;
  }

  .hce-message.success {
    background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
    border: 1px solid #86efac;
    color: #166534;
  }
  .hce-message.success::before { background: #22c55e; }

  .hce-message.error {
    background: linear-gradient(135deg, #fff1f2, #fef2f2);
    border: 1px solid #fca5a5;
    color: #991b1b;
  }
  .hce-message.error::before { background: #ef4444; }

  .hce-message.hidden { display: none; }

  .hce-message-icon {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }
  .hce-message.success .hce-message-icon { background: rgba(34,197,94,0.15); }
  .hce-message.error .hce-message-icon { background: rgba(239,68,68,0.15); }

  /* ── TABS ── */
  .hce-tabs-wrapper {
    position: relative;
    margin-bottom: 28px;
  }

  .hce-tabs-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .hce-tabs-scroll::-webkit-scrollbar { display: none; }

  .hce-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 14px;
    border: 1.5px solid transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    white-space: nowrap;
    background: rgba(255,255,255,0.8);
    color: var(--muted);
    border-color: rgba(234,215,166,0.5);
    position: relative;
    overflow: hidden;
  }

  .hce-tab::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .hce-tab:hover:not(.active) {
    border-color: var(--gold-border);
    color: var(--gold-dark);
    background: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(184,134,11,0.12);
  }

  .hce-tab.active {
    color: white;
    border-color: transparent;
    box-shadow: 0 6px 20px rgba(184,134,11,0.3);
    transform: translateY(-1px);
  }
  .hce-tab.active::before { opacity: 1; }

  .hce-tab-label { position: relative; z-index: 1; }
  .hce-tab-icon { position: relative; z-index: 1; font-size: 14px; }

  .hce-tab-count {
    position: relative;
    z-index: 1;
    min-width: 20px;
    height: 20px;
    border-radius: 999px;
    background: rgba(255,255,255,0.25);
    color: inherit;
    font-size: 10.5px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
  }

  /* ── EDITOR GRID ── */
  .hce-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    animation: hceFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* ── PANEL ── */
  .hce-panel {
    background: var(--white);
    border: 1px solid rgba(234,215,166,0.7);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(0,0,0,0.05), 0 1px 0 rgba(234,215,166,0.5);
    transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
    animation: hceFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }

  .hce-panel:hover {
    box-shadow: 0 8px 32px rgba(184,134,11,0.12), 0 1px 0 rgba(234,215,166,0.6);
    border-color: rgba(184,134,11,0.3);
  }

  .hce-panel.full { grid-column: 1 / -1; }

  .hce-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 20px 24px 0;
    margin-bottom: 20px;
  }

  .hce-panel-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hce-panel-icon {
    width: 38px; height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(184,134,11,0.28);
    color: white;
  }

  .hce-panel-title-text {}
  .hce-panel-title-text h2 {
    font-size: 15px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.2px;
    line-height: 1.2;
  }
  .hce-panel-title-text span {
    font-size: 11.5px;
    color: var(--muted);
    font-weight: 500;
  }

  .hce-panel-body { padding: 0 24px 24px; }

  .hce-panel-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(184,134,11,0.15), transparent);
    margin: 0 24px 20px;
  }

  /* ── FIELD ── */
  .hce-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 16px;
  }

  .hce-field:last-child { margin-bottom: 0; }

  .hce-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 800;
    color: var(--gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .hce-label-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--gold);
    flex-shrink: 0;
  }

  .hce-input,
  .hce-textarea,
  .hce-select {
    width: 100%;
    border: 1.5px solid #e8e0d0;
    border-radius: 13px;
    padding: 11px 14px;
    font-family: inherit;
    font-size: 13.5px;
    color: var(--text);
    background: #fdfaf5;
    outline: none;
    transition: border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
  }

  .hce-textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.65;
  }

  .hce-input:focus,
  .hce-textarea:focus,
  .hce-select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(184,134,11,0.14);
    background: var(--white);
  }

  .hce-input::placeholder,
  .hce-textarea::placeholder { color: #c0b090; }

  .hce-input:hover:not(:focus),
  .hce-textarea:hover:not(:focus) {
    border-color: rgba(184,134,11,0.4);
  }

  /* ── GRID HELPERS ── */
  .hce-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .hce-three-col {
    display: grid;
    grid-template-columns: 1fr 120px 100px;
    gap: 12px;
  }

  /* ── IMAGE UPLOAD ZONES ── */
  .hce-image-zone {
    border-radius: 18px;
    border: 2px dashed rgba(184,134,11,0.3);
    background: linear-gradient(135deg, #fdf8ef, #faf5e8);
    overflow: hidden;
    transition: border-color 0.25s ease, background 0.25s ease;
    margin-bottom: 16px;
    position: relative;
  }

  .hce-image-zone:hover { border-color: var(--gold); background: #fdf8ef; }

  .hce-image-zone.tall { min-height: 300px; }
  .hce-image-zone.medium { min-height: 220px; }

  .hce-image-zone img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 16px;
    transition: transform 0.4s ease;
  }

  .hce-image-zone:hover img { transform: scale(1.02); }

  .hce-image-placeholder {
    min-height: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    color: var(--muted);
  }

  .hce-image-placeholder-icon {
    width: 56px; height: 56px;
    border-radius: 16px;
    background: rgba(184,134,11,0.1);
    border: 1.5px solid var(--gold-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--gold);
    font-size: 22px;
  }

  .hce-image-placeholder p {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    text-align: center;
  }

  .hce-image-placeholder small {
    font-size: 11.5px;
    color: #b0a080;
    text-align: center;
  }

  /* ── FILE INPUT ── */
  .hce-file-input-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 12px;
    background: var(--gold-pale);
    border: 1.5px solid var(--gold-border);
    color: var(--gold-dark);
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s ease;
    width: 100%;
    justify-content: center;
  }

  .hce-file-input-wrapper:hover {
    background: rgba(184,134,11,0.12);
    border-color: var(--gold);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(184,134,11,0.18);
  }

  .hce-file-input-wrapper input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
  }

  /* ── HINT TEXT ── */
  .hce-hint {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(184,134,11,0.06);
    border-radius: 10px;
    border-left: 3px solid rgba(184,134,11,0.35);
    font-size: 12px;
    color: #7a6830;
    line-height: 1.6;
    margin: 8px 0 14px;
    font-weight: 500;
  }

  /* ── ARRAY ROWS ── */
  .hce-array-list { display: flex; flex-direction: column; gap: 10px; }

  .hce-array-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 12px;
    background: #fdfaf5;
    border: 1.5px solid rgba(234,215,166,0.6);
    border-radius: 14px;
    transition: all 0.2s ease;
  }

  .hce-array-row:hover {
    border-color: var(--gold-border);
    background: white;
    box-shadow: 0 2px 10px rgba(184,134,11,0.08);
  }

  .hce-array-row.two { grid-template-columns: 1fr 1fr auto; }

  .hce-array-row.stats-row {
    grid-template-columns: 1.1fr 100px 80px 1.3fr auto;
  }

  .hce-plain-input {
    width: 100%;
    border: 1.5px solid #e8e0d0;
    border-radius: 10px;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 13px;
    color: var(--text);
    background: white;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .hce-plain-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(184,134,11,0.12);
  }

  /* ── GALLERY ── */
  .hce-gallery-stats {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(184,134,11,0.06), rgba(212,160,23,0.04));
    border: 1.5px solid var(--gold-border);
    border-radius: 14px;
    margin: 14px 0;
  }

  .hce-gallery-stat-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex; align-items: center; justify-content: center;
    color: white;
    font-size: 16px;
    flex-shrink: 0;
  }

  .hce-gallery-stat-info {}
  .hce-gallery-stat-num { font-size: 22px; font-weight: 800; color: var(--gold-dark); line-height: 1; }
  .hce-gallery-stat-label { font-size: 11.5px; color: var(--muted); font-weight: 600; }

  .hce-gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .hce-gallery-item {
    border: 2px solid rgba(234,215,166,0.6);
    border-radius: 20px;
    padding: 12px;
    background: white;
    transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
    position: relative;
    overflow: hidden;
  }

  .hce-gallery-item::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(184,134,11,0.05), transparent);
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }

  .hce-gallery-item:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(184,134,11,0.15); border-color: var(--gold-border); }
  .hce-gallery-item:hover::before { opacity: 1; }

  .hce-gallery-item.selected {
    border-color: var(--gold);
    background: #fffbf0;
    box-shadow: 0 8px 24px rgba(184,134,11,0.18);
  }

  .hce-gallery-img-wrapper {
    width: 100%;
    height: 148px;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 12px;
    background: var(--bg);
    position: relative;
  }

  .hce-gallery-img-wrapper img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }

  .hce-gallery-item:hover .hce-gallery-img-wrapper img { transform: scale(1.06); }

  .hce-gallery-selected-badge {
    position: absolute;
    top: 8px; right: 8px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 999px;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 8px rgba(184,134,11,0.35);
  }

  .hce-gallery-checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    padding: 4px 0;
  }

  .hce-gallery-checkbox-row input[type="checkbox"] {
    width: 16px; height: 16px;
    accent-color: var(--gold);
    cursor: pointer;
    flex-shrink: 0;
  }

  .hce-gallery-checkbox-row span {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--gold-dark);
  }

  .hce-gallery-filename {
    font-size: 11px;
    color: var(--muted);
    word-break: break-all;
    margin-bottom: 10px;
    font-weight: 500;
  }

  /* ── FEATURE CARDS ── */
  .hce-feature-card {
    background: #fdfaf5;
    border: 1.5px solid rgba(234,215,166,0.6);
    border-radius: 18px;
    padding: 18px;
    margin-bottom: 14px;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .hce-feature-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--gold-dark), var(--gold), var(--gold-light));
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .hce-feature-card:hover {
    border-color: var(--gold-border);
    background: white;
    box-shadow: 0 6px 24px rgba(184,134,11,0.1);
  }
  .hce-feature-card:hover::before { opacity: 1; }

  .hce-feature-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .hce-feature-card-num {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hce-feature-num-badge {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    font-size: 12px;
    font-weight: 800;
    display: flex; align-items: center; justify-content: center;
  }

  .hce-feature-card-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }

  /* ── JSON EDITOR ── */
  .hce-json-wrapper {
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid #1e293b;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }

  .hce-json-topbar {
    background: #1e293b;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .hce-json-dots {
    display: flex;
    gap: 7px;
  }

  .hce-json-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
  }

  .hce-json-dot:nth-child(1) { background: #ff5f57; }
  .hce-json-dot:nth-child(2) { background: #ffbd2e; }
  .hce-json-dot:nth-child(3) { background: #28ca41; }

  .hce-json-filename {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    font-family: Consolas, Monaco, monospace;
    font-weight: 600;
  }

  .hce-json-editor {
    width: 100%;
    min-height: 660px;
    background: #0f172a;
    color: #e2e8f0;
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.7;
    padding: 20px;
    outline: none;
    border: none;
    resize: vertical;
    transition: background 0.2s ease;
  }

  .hce-json-editor:focus { background: #0d1526; }

  /* ── SECTION DIVIDER ── */
  .hce-section-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 20px 0 16px;
  }

  .hce-section-divider-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(184,134,11,0.2), transparent);
  }

  .hce-section-divider-text {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--muted);
  }

  /* ── ADD ITEM ZONE ── */
  .hce-add-zone {
    border: 2px dashed rgba(184,134,11,0.25);
    border-radius: 14px;
    padding: 16px;
    text-align: center;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    background: rgba(184,134,11,0.02);
    margin-top: 12px;
  }

  .hce-add-zone:hover {
    border-color: var(--gold);
    background: var(--gold-pale);
    color: var(--gold-dark);
    transform: translateY(-1px);
  }

  /* ── LOADING ── */
  .hce-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 20px;
  }

  .hce-spinner {
    width: 52px; height: 52px;
    border-radius: 50%;
    border: 3px solid rgba(184,134,11,0.15);
    border-top-color: var(--gold);
    animation: hceSpin 0.9s linear infinite;
  }

  .hce-loading p {
    color: var(--muted);
    font-weight: 600;
    font-size: 14px;
    animation: hcePulse 1.5s ease-in-out infinite;
  }

  /* ── EMPTY STATE ── */
  .hce-empty {
    text-align: center;
    padding: 32px 20px;
    color: var(--muted);
  }

  .hce-empty-icon {
    font-size: 36px;
    margin-bottom: 10px;
    opacity: 0.4;
  }

  .hce-empty p { font-size: 13.5px; font-weight: 500; }

  /* ── ANIMATIONS ── */
  @keyframes hceSlideDown {
    from { opacity: 0; transform: translateY(-18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes hceFadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes hceSpin {
    to { transform: rotate(360deg); }
  }

  @keyframes hcePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 980px) {
    .admin-sidebar { transform: translateX(-105%); transition: transform var(--transition); }
    .admin-sidebar.open { transform: translateX(0); }
    .admin-main { margin-left: 0; }
    .admin-mobile-topbar { display: flex; }
  }

  @media (max-width: 760px) {
    .hce-container { padding: 24px 0 50px; }
    .hce-page-hero { padding: 28px 24px; }
    .hce-page-hero h1 { font-size: 26px; }
    .hce-grid { grid-template-columns: 1fr; }
    .hce-two-col { grid-template-columns: 1fr; }
    .hce-three-col { grid-template-columns: 1fr; }
    .hce-array-row.two { grid-template-columns: 1fr; }
    .hce-array-row.stats-row { grid-template-columns: 1fr; }
    .hce-gallery-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  }
`;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStoredAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function buildAdminHeaders(json = true) {
  const token = getAdminToken();
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

function getContentFromResponse(result) {
  if (result?.data?.content) return result.data.content;
  if (result?.data?.gallery || result?.data?.hero || result?.data?.footer) return result.data;
  if (result?.content) return result.content;
  return result;
}

function getGalleryFilesFromResponse(result, fallback = []) {
  if (Array.isArray(result?.gallery_files)) return result.gallery_files;
  if (Array.isArray(result?.data?.gallery_files)) return result.data.gallery_files;
  return fallback;
}

function buildSelectedGalleryImages(selectedUrls, galleryFiles) {
  return selectedUrls
    .map((url, index) => {
      const file = galleryFiles.find((item) => item.url === url);
      if (!file) return null;
      return {
        id: file.id || file.name?.split(".")[0] || `gallery_${index + 1}`,
        url: file.url,
        alt: `Gallery Image ${index + 1}`,
      };
    })
    .filter(Boolean);
}

async function requestAdminApi(endpoint, options = {}) {
  const token = getAdminToken();
  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    cache: "no-store",
    headers: { ...buildAdminHeaders(true), ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    const error = new Error(result.message || "Unauthorized");
    error.status = response.status;
    throw error;
  }
  if (!response.ok || result.success === false) {
    const validationErrors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    throw new Error(result.error || validationErrors || result.message || "Request failed.");
  }
  return result;
}

async function requestAdminForm(endpoint, formData) {
  const token = getAdminToken();
  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: buildAdminHeaders(false),
    body: formData,
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    const error = new Error(result.message || "Unauthorized");
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const validationErrors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    throw new Error(result.error || validationErrors || result.message || "Upload failed.");
  }
  return result;
}

function mergeContent(content) {
  const incoming = content && typeof content === "object" ? content : {};
  return {
    ...clone(emptyContent),
    ...incoming,
    nav: { ...emptyContent.nav, ...(incoming.nav || {}) },
    hero: { ...emptyContent.hero, ...(incoming.hero || {}) },
    calendar_section: { ...emptyContent.calendar_section, ...(incoming.calendar_section || {}) },
    our_story: { ...emptyContent.our_story, ...(incoming.our_story || {}) },
    creating_experiences: { ...emptyContent.creating_experiences, ...(incoming.creating_experiences || {}) },
    gallery: { ...emptyContent.gallery, ...(incoming.gallery || {}) },
    features_section: { ...emptyContent.features_section, ...(incoming.features_section || {}) },
    booking_cta: { ...emptyContent.booking_cta, ...(incoming.booking_cta || {}) },
    footer: { ...emptyContent.footer, ...(incoming.footer || {}) },
    stats: Array.isArray(incoming.stats) ? incoming.stats : [],
  };
}

function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return url;
  return `/${url}`;
}

function adminPreviewUrl(url, version) {
  const resolvedUrl = resolveAssetUrl(url);
  if (!resolvedUrl) return "";
  const separator = resolvedUrl.includes("?") ? "&" : "?";
  return `${resolvedUrl}${separator}adminPreview=${version || Date.now()}`;
}

function getPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function setPath(object, path, value) {
  const next = clone(object);
  const keys = path.split(".");
  let current = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) { current[key] = value; return; }
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  });
  return next;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

/* ── FIELD COMPONENTS ── */
function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="hce-field">
      <label className="hce-label">
        <span className="hce-label-dot" />
        {label}
      </label>
      <input
        className="hce-input"
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4, placeholder = "" }) {
  return (
    <div className="hce-field">
      <label className="hce-label">
        <span className="hce-label-dot" />
        {label}
      </label>
      <textarea
        className="hce-textarea"
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Panel({ title, subtitle = "", icon, children, full = false, action = null }) {
  return (
    <section className={`hce-panel ${full ? "full" : ""}`.trim()}>
      <div className="hce-panel-header">
        <div className="hce-panel-title-group">
          <span className="hce-panel-icon">{icon}</span>
          <div className="hce-panel-title-text">
            <h2>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="hce-panel-divider" />
      <div className="hce-panel-body">{children}</div>
    </section>
  );
}

/* ── ICONS ── */
function IconBars({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconFile({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

/* ── TABS CONFIG ── */
const TABS = [
  { key: "hero", label: "Hero", icon: "🎯" },
  { key: "story", label: "Story", icon: "📖" },
  { key: "gallery", label: "Gallery", icon: "🖼️" },
  { key: "nav", label: "Navigation", icon: "🧭" },
  { key: "stats", label: "Stats", icon: "📊" },
  { key: "calendar", label: "Calendar", icon: "📅" },
  { key: "features", label: "Features", icon: "⭐" },
  { key: "cta", label: "CTA", icon: "🚀" },
  { key: "footer", label: "Footer", icon: "📋" },
  { key: "advanced", label: "JSON", icon: "{ }" },
];

export default function AdminHomepageContentPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [activeTab, setActiveTab] = useState("hero");
  const [content, setContent] = useState(() => clone(emptyContent));
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [selectedGalleryUrls, setSelectedGalleryUrls] = useState([]);
  const [advancedJson, setAdvancedJson] = useState("");
  const [previewVersion, setPreviewVersion] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const adminName = admin?.name || "Admin";
  

  const selectedGalleryFiles = useMemo(() => {
    return selectedGalleryUrls
      .map((url) => galleryFiles.find((file) => file.url === url))
      .filter(Boolean);
  }, [galleryFiles, selectedGalleryUrls]);

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    navigate("/admin-login");
  }, [navigate]);

  const handleError = useCallback((error, fallback = "Something went wrong.") => {
    if (error?.status === 401 || error?.status === 403 || String(error?.message || "").toLowerCase().includes("unauthorized")) {
      redirectToLogin(); return;
    }
    setMessage({ type: "error", text: error.message || fallback });
  }, [redirectToLogin]);

  const updateField = useCallback((path, value) => {
    setContent((prev) => setPath(prev, path, value));
  }, []);

  const updateArrayItem = useCallback((path, index, key, value) => {
    setContent((prev) => {
      const items = arrayValue(getPath(prev, path));
      const nextItems = items.map((item, i) => i !== index ? item : { ...item, [key]: value });
      return setPath(prev, path, nextItems);
    });
  }, []);

  const addArrayItem = useCallback((path, item) => {
    setContent((prev) => {
      const items = arrayValue(getPath(prev, path));
      return setPath(prev, path, [...items, item]);
    });
  }, []);

  const removeArrayItem = useCallback((path, index) => {
    setContent((prev) => {
      const items = arrayValue(getPath(prev, path));
      return setPath(prev, path, items.filter((_, i) => i !== index));
    });
  }, []);

  const loadEditorData = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await requestAdminApi(`/admin/homepage-content?t=${Date.now()}`, { method: "GET" });
      const data = normalizeApiData(result);
      const nextContent = mergeContent(data?.content || data || {});
      const files = data?.gallery_files || [];
      setContent(nextContent);
      setGalleryFiles(files);
      setSelectedGalleryUrls(arrayValue(nextContent.gallery.images).map((img) => img.url));
      setAdvancedJson(JSON.stringify(nextContent, null, 2));
    } catch (error) {
      handleError(error, "Homepage content loading failed.");
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const saveContent = useCallback(async (customContent = content) => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const latestGalleryImages = buildSelectedGalleryImages(selectedGalleryUrls, galleryFiles);
      const contentToSave = { ...customContent, gallery: { ...customContent.gallery, images: latestGalleryImages } };
      const result = await requestAdminApi("/admin/homepage-content", { method: "PUT", body: JSON.stringify(contentToSave) });
      const nextContent = mergeContent(getContentFromResponse(result));
      const nextSelectedUrls = arrayValue(nextContent.gallery.images).map((img) => img.url);
      setContent(nextContent);
      setSelectedGalleryUrls(nextSelectedUrls);
      setAdvancedJson(JSON.stringify(nextContent, null, 2));
      setMessage({ type: "success", text: "Homepage content saved successfully." });
      await loadEditorData();
    } catch (error) {
      handleError(error, "Homepage content save failed.");
    } finally {
      setIsSaving(false);
    }
  }, [content, galleryFiles, handleError, loadEditorData, selectedGalleryUrls]);

  const uploadSectionImage = useCallback(async (target, file) => {
    if (!file) return;
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("target", target);
      formData.append("image", file);
      const result = await requestAdminForm("/admin/homepage-content/upload-section-image", formData);
      const nextContent = mergeContent(normalizeApiData(result));
      setContent(nextContent);
      setAdvancedJson(JSON.stringify(nextContent, null, 2));
      setPreviewVersion(Date.now());
      setMessage({ type: "success", text: "Image uploaded and JSON updated successfully." });
    } catch (error) {
      handleError(error, "Image upload failed.");
    } finally {
      setIsSaving(false);
    }
  }, [handleError]);

  const uploadGalleryImages = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images[]", file));
      const result = await requestAdminForm("/admin/homepage-content/gallery/upload", formData);
      setGalleryFiles(result.gallery_files || []);
      setMessage({ type: "success", text: "Gallery images uploaded successfully. Now select which images should show on homepage." });
    } catch (error) {
      handleError(error, "Gallery upload failed.");
    } finally {
      setIsSaving(false);
    }
  }, [handleError]);

  const saveGallerySelection = useCallback(async () => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const latestSelectedImages = buildSelectedGalleryImages(selectedGalleryUrls, galleryFiles);
      const result = await requestAdminApi("/admin/homepage-content/gallery/select", {
        method: "POST",
        body: JSON.stringify({ selected_urls: latestSelectedImages.map((img) => img.url) }),
      });
      const latestContent = mergeContent(getContentFromResponse(result));
      const latestGalleryFiles = getGalleryFilesFromResponse(result, galleryFiles);
      const latestSelectedUrls = arrayValue(latestContent.gallery.images).map((img) => img.url);
      setContent(latestContent);
      setGalleryFiles(latestGalleryFiles);
      setSelectedGalleryUrls(latestSelectedUrls);
      setAdvancedJson(JSON.stringify(latestContent, null, 2));
      setMessage({ type: "success", text: "Selected homepage gallery images saved successfully." });
      await loadEditorData();
    } catch (error) {
      handleError(error, "Gallery selection save failed.");
    } finally {
      setIsSaving(false);
    }
  }, [galleryFiles, handleError, loadEditorData, selectedGalleryUrls]);

  const deleteGalleryFile = useCallback(async (file) => {
    const confirmed = window.confirm(`Delete ${file.name} from hosting and remove it from homepage JSON?`);
    if (!confirmed) return;
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await requestAdminApi("/admin/homepage-content/gallery/file", { method: "DELETE", body: JSON.stringify({ url: file.url }) });
      const nextContent = mergeContent(normalizeApiData(result));
      setContent(nextContent);
      setGalleryFiles(result.gallery_files || []);
      setSelectedGalleryUrls(arrayValue(nextContent.gallery.images).map((img) => img.url));
      setAdvancedJson(JSON.stringify(nextContent, null, 2));
      setMessage({ type: "success", text: "Gallery image deleted from hosting successfully." });
    } catch (error) {
      handleError(error, "Gallery image delete failed.");
    } finally {
      setIsSaving(false);
    }
  }, [handleError]);

  const toggleGallerySelection = useCallback((url) => {
    setSelectedGalleryUrls((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) { redirectToLogin(); return; }
    document.body.classList.add("admin-layout");
    loadEditorData();
    return () => document.body.classList.remove("admin-layout");
  }, [loadEditorData, redirectToLogin]);

  useEffect(() => {
    setAdvancedJson(JSON.stringify(content, null, 2));
  }, [content]);

  if (isLoading) {
    return (
      <>
        <style>{adminHomepageStyles}</style>
        <main className="admin-main" style={{ marginLeft: 0 }}>
          <div className="hce-container">
            <div className="hce-loading">
              <div className="hce-spinner" />
              <p>Loading homepage editor…</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{adminHomepageStyles}</style>

      {/* ── SIDEBAR (unchanged) ── */}

      <Sidebar admin={admin} />

      <main className="admin-main">
        {/* Mobile topbar */}
        <div className="admin-mobile-topbar">
          <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)}>☰</button>
          <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
        </div>

        <div className="hce-container">

          {/* ── PAGE HERO HEADER ── */}
          <div className="hce-page-hero">
            <div className="hce-hero-left">
              <div className="hce-hero-badge">
                <span />
                Live Editor
              </div>
              <h1>Homepage <em>Content</em> Editor</h1>
              <p>Edit every section of your homepage — text, images, gallery and footer — all from one place. Changes reflect on your live site instantly.</p>
            </div>
            <div className="hce-hero-actions">
              <button className="btn btn-ghost" type="button" onClick={loadEditorData} disabled={isSaving}>
                <IconRefresh /> Refresh
              </button>
              <button className="btn btn-primary" type="button" onClick={() => saveContent()} disabled={isSaving}>
                <IconSave />
                {isSaving ? "Saving…" : "Save All Changes"}
              </button>
            </div>
          </div>

          {/* ── MESSAGE ── */}
          <div className={`hce-message ${message.text ? message.type : "hidden"}`.trim()}>
            <div className="hce-message-icon">
              {message.type === "success" ? <IconCheck /> : <IconAlert />}
            </div>
            <span>{message.text}</span>
          </div>

          {/* ── TABS ── */}
          <div className="hce-tabs-wrapper">
            <div className="hce-tabs-scroll">
              {TABS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`hce-tab ${activeTab === key ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveTab(key)}
                >
                  <span className="hce-tab-icon">{icon}</span>
                  <span className="hce-tab-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ══════════ HERO TAB ══════════ */}
          {activeTab === "hero" && (
            <div className="hce-grid">
              <Panel title="Hero Section Content" subtitle="Main headline & call-to-action buttons" icon={<IconEdit />}>
                <Field label="Hero Title" value={content.hero.title} onChange={(v) => updateField("hero.title", v)} placeholder="Enter main headline…" />
                <Field label="Highlighted Text" value={content.hero.highlight} onChange={(v) => updateField("hero.highlight", v)} placeholder="Golden gradient text…" />
                <TextArea label="Subtitle" value={content.hero.subtitle} onChange={(v) => updateField("hero.subtitle", v)} placeholder="Supporting description…" />

                <div className="hce-section-divider">
                  <div className="hce-section-divider-line" />
                  <span className="hce-section-divider-text">Buttons</span>
                  <div className="hce-section-divider-line" />
                </div>

                <div className="hce-two-col">
                  <Field label="Primary Button Text" value={content.hero.primary_button_text} onChange={(v) => updateField("hero.primary_button_text", v)} />
                  <Field label="Primary Button Link" value={content.hero.primary_button_link} onChange={(v) => updateField("hero.primary_button_link", v)} />
                </div>
                <div className="hce-two-col">
                  <Field label="Secondary Button Text" value={content.hero.secondary_button_text} onChange={(v) => updateField("hero.secondary_button_text", v)} />
                  <Field label="Secondary Button Link" value={content.hero.secondary_button_link} onChange={(v) => updateField("hero.secondary_button_link", v)} />
                </div>
              </Panel>

              <Panel title="Hero Background Image" subtitle="Full-width section background" icon={<IconImage />}>
                <div className="hce-image-zone tall">
                  {content.hero.background_image ? (
                    <img key={`hero-${previewVersion}`} src={adminPreviewUrl(content.hero.background_image, previewVersion)} alt="Hero background" />
                  ) : (
                    <div className="hce-image-placeholder">
                      <div className="hce-image-placeholder-icon">🖼️</div>
                      <p>No image uploaded yet</p>
                      <small>Recommended: 1920×1080px or wider</small>
                    </div>
                  )}
                </div>
                <div className="hce-hint">
                  <span>ℹ️</span>
                  Saves to <strong>/uploads/homepage/hero-background.ext</strong> and auto-updates homepage-content.json.
                </div>
                <label className="hce-file-input-wrapper">
                  <IconUpload /> Choose Hero Image
                  <input type="file" accept="image/*" onChange={(e) => uploadSectionImage("hero_background", e.target.files?.[0])} />
                </label>
              </Panel>
            </div>
          )}

          {/* ══════════ STORY TAB ══════════ */}
          {activeTab === "story" && (
            <div className="hce-grid">
              <Panel title="Our Story Section" subtitle="Brand narrative & heritage content" icon={<IconEdit />}>
                <Field label="Eyebrow" value={content.our_story.eyebrow} onChange={(v) => updateField("our_story.eyebrow", v)} placeholder="e.g. Since 1960" />
                <Field label="Title" value={content.our_story.title} onChange={(v) => updateField("our_story.title", v)} />
                <TextArea label="Description" value={content.our_story.description} onChange={(v) => updateField("our_story.description", v)} rows={5} />
              </Panel>

              <Panel title="Creating Experiences Image" subtitle="Side section visual" icon={<IconImage />}>
                <div className="hce-image-zone medium">
                  {content.creating_experiences.image ? (
                    <img key={`creating-${previewVersion}`} src={adminPreviewUrl(content.creating_experiences.image, previewVersion)} alt="Creating Experiences" />
                  ) : (
                    <div className="hce-image-placeholder">
                      <div className="hce-image-placeholder-icon">✨</div>
                      <p>No image uploaded yet</p>
                      <small>Recommended: 800×600px</small>
                    </div>
                  )}
                </div>
                <div className="hce-hint">
                  <span>ℹ️</span>
                  Saves to <strong>/uploads/homepage/creating-experiences.ext</strong>
                </div>
                <label className="hce-file-input-wrapper">
                  <IconUpload /> Choose Section Image
                  <input type="file" accept="image/*" onChange={(e) => uploadSectionImage("creating_experiences_image", e.target.files?.[0])} />
                </label>
              </Panel>

              <Panel title="Creating Experiences Content" subtitle="Full section copy & links" icon={<IconEdit />} full>
                <div className="hce-two-col">
                  <Field label="Image Alt Text" value={content.creating_experiences.image_alt} onChange={(v) => updateField("creating_experiences.image_alt", v)} />
                  <Field label="Badge Text" value={content.creating_experiences.badge_text} onChange={(v) => updateField("creating_experiences.badge_text", v)} />
                </div>
                <Field label="Eyebrow" value={content.creating_experiences.eyebrow} onChange={(v) => updateField("creating_experiences.eyebrow", v)} />
                <Field label="Title" value={content.creating_experiences.title} onChange={(v) => updateField("creating_experiences.title", v)} />
                <div className="hce-two-col">
                  <TextArea label="Description 1" value={content.creating_experiences.description_1} onChange={(v) => updateField("creating_experiences.description_1", v)} />
                  <TextArea label="Description 2" value={content.creating_experiences.description_2} onChange={(v) => updateField("creating_experiences.description_2", v)} />
                </div>
                <div className="hce-two-col">
                  <Field label="Button Text" value={content.creating_experiences.button_text} onChange={(v) => updateField("creating_experiences.button_text", v)} />
                  <Field label="Button Link" value={content.creating_experiences.button_link} onChange={(v) => updateField("creating_experiences.button_link", v)} />
                </div>
              </Panel>

              <Panel
                title="Experience Points"
                subtitle="Bullet highlights shown in section"
                icon={<IconPlus />}
                full
                action={
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => addArrayItem("creating_experiences.points", "New Point")}>
                    <IconPlus /> Add Point
                  </button>
                }
              >
                {arrayValue(content.creating_experiences.points).length === 0 && (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">📝</div>
                    <p>No points added yet. Click "Add Point" to start.</p>
                  </div>
                )}
                <div className="hce-array-list">
                  {arrayValue(content.creating_experiences.points).map((point, index) => (
                    <div className="hce-array-row" key={`${point}-${index}`}>
                      <input
                        className="hce-plain-input"
                        value={point}
                        placeholder="Enter experience point…"
                        onChange={(e) => {
                          const points = [...arrayValue(content.creating_experiences.points)];
                          points[index] = e.target.value;
                          updateField("creating_experiences.points", points);
                        }}
                      />
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeArrayItem("creating_experiences.points", index)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
                {arrayValue(content.creating_experiences.points).length > 0 && (
                  <div className="hce-add-zone" onClick={() => addArrayItem("creating_experiences.points", "")}>
                    + Add another point
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* ══════════ GALLERY TAB ══════════ */}
          {activeTab === "gallery" && (
            <div className="hce-grid">
              <Panel title="Gallery Section Text" subtitle="Headlines shown above the image grid" icon={<IconEdit />}>
                <Field label="Eyebrow" value={content.gallery.eyebrow} onChange={(v) => updateField("gallery.eyebrow", v)} />
                <Field label="Title" value={content.gallery.title} onChange={(v) => updateField("gallery.title", v)} />
                <TextArea label="Description" value={content.gallery.description} onChange={(v) => updateField("gallery.description", v)} />
                <Field label="Empty Gallery Text" value={content.gallery.empty_text} onChange={(v) => updateField("gallery.empty_text", v)} placeholder="Shown when no images selected" />
              </Panel>

              <Panel title="Upload Gallery Images" subtitle="Add new photos to the hosting folder" icon={<IconImage />}>
                <div className="hce-hint">
                  <span>ℹ️</span>
                  Images are saved in <strong>/uploads/homepage/gallery/</strong> as gallery_1, gallery_2, etc.
                </div>

                <label className="hce-file-input-wrapper" style={{ marginBottom: 16 }}>
                  <IconUpload /> Choose Images (multiple)
                  <input type="file" accept="image/*" multiple onChange={(e) => uploadGalleryImages(e.target.files)} />
                </label>

                <div className="hce-gallery-stats">
                  <div className="hce-gallery-stat-icon">🖼️</div>
                  <div className="hce-gallery-stat-info">
                    <div className="hce-gallery-stat-num">{selectedGalleryUrls.length}</div>
                    <div className="hce-gallery-stat-label">selected for homepage</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <div className="hce-gallery-stat-num" style={{ fontSize: 18 }}>{galleryFiles.length}</div>
                    <div className="hce-gallery-stat-label">total in folder</div>
                  </div>
                </div>

                <button className="btn btn-primary" type="button" style={{ width: "100%" }} disabled={isSaving} onClick={saveGallerySelection}>
                  <IconSave />
                  Save Gallery Selection
                </button>
              </Panel>

              <Panel title="All Gallery Images" subtitle="Check boxes to show images on homepage" icon={<IconImage />} full>
                {galleryFiles.length === 0 ? (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">📁</div>
                    <p>No images in the gallery folder yet. Upload some above.</p>
                  </div>
                ) : (
                  <div className="hce-gallery-grid">
                    {galleryFiles.map((file) => (
                      <div className={`hce-gallery-item ${selectedGalleryUrls.includes(file.url) ? "selected" : ""}`} key={file.url}>
                        <div className="hce-gallery-img-wrapper">
                          <img src={file.url} alt={file.name} />
                          {selectedGalleryUrls.includes(file.url) && (
                            <span className="hce-gallery-selected-badge">✓ Selected</span>
                          )}
                        </div>
                        <label className="hce-gallery-checkbox-row">
                          <input type="checkbox" checked={selectedGalleryUrls.includes(file.url)} onChange={() => toggleGallerySelection(file.url)} />
                          <span>Show on homepage</span>
                        </label>
                        <p className="hce-gallery-filename">{file.name}</p>
                        <button className="btn btn-danger btn-sm" style={{ width: "100%" }} type="button" onClick={() => deleteGalleryFile(file)}>
                          <IconTrash /> Delete from Hosting
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Homepage Gallery Preview" subtitle="Images currently shown on the live site" icon={<IconImage />} full>
                {selectedGalleryFiles.length === 0 ? (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">🖼️</div>
                    <p>No images selected for homepage yet.</p>
                  </div>
                ) : (
                  <div className="hce-gallery-grid">
                    {selectedGalleryFiles.map((file) => (
                      <div className="hce-gallery-item selected" key={file.url}>
                        <div className="hce-gallery-img-wrapper">
                          <img src={file.url} alt={file.name} />
                          <span className="hce-gallery-selected-badge">✓ Live</span>
                        </div>
                        <p className="hce-gallery-filename">{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* ══════════ NAV TAB ══════════ */}
          {activeTab === "nav" && (
            <div className="hce-grid">
              <Panel title="Navigation Settings" subtitle="Logo, buttons & link labels" icon={<IconEdit />}>
                <Field label="Logo Path" value={content.nav.logo} onChange={(v) => updateField("nav.logo", v)} />
                <label className="hce-file-input-wrapper" style={{ marginBottom: 16 }}>
                  <IconUpload /> Replace Nav Logo
                  <input type="file" accept="image/*" onChange={(e) => uploadSectionImage("nav_logo", e.target.files?.[0])} />
                </label>
                <Field label="Logo Alt" value={content.nav.logo_alt} onChange={(v) => updateField("nav.logo_alt", v)} />

                <div className="hce-section-divider">
                  <div className="hce-section-divider-line" />
                  <span className="hce-section-divider-text">Button Labels</span>
                  <div className="hce-section-divider-line" />
                </div>

                <div className="hce-two-col">
                  <Field label="Booking Button Text" value={content.nav.booking_button_text} onChange={(v) => updateField("nav.booking_button_text", v)} />
                  <Field label="Booking Button Link" value={content.nav.booking_button_link} onChange={(v) => updateField("nav.booking_button_link", v)} />
                </div>
                <div className="hce-two-col">
                  <Field label="Login Text" value={content.nav.login_text} onChange={(v) => updateField("nav.login_text", v)} />
                  <Field label="Admin Login Text" value={content.nav.admin_login_text} onChange={(v) => updateField("nav.admin_login_text", v)} />
                </div>
                <Field label="Logout Text" value={content.nav.logout_text} onChange={(v) => updateField("nav.logout_text", v)} />
              </Panel>

              <Panel
                title="Navbar Links"
                subtitle="Main navigation menu items"
                icon={<IconFile />}
                action={
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => addArrayItem("nav.links", { label: "New Link", href: "#" })}>
                    <IconPlus /> Add Link
                  </button>
                }
              >
                {arrayValue(content.nav.links).length === 0 && (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">🧭</div>
                    <p>No navigation links yet.</p>
                  </div>
                )}
                <div className="hce-array-list">
                  {arrayValue(content.nav.links).map((link, index) => (
                    <div className="hce-array-row two" key={`${link.label}-${index}`}>
                      <input className="hce-plain-input" placeholder="Label" value={link.label || ""} onChange={(e) => updateArrayItem("nav.links", index, "label", e.target.value)} />
                      <input className="hce-plain-input" placeholder="URL / href" value={link.href || ""} onChange={(e) => updateArrayItem("nav.links", index, "href", e.target.value)} />
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeArrayItem("nav.links", index)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ══════════ STATS TAB ══════════ */}
          {activeTab === "stats" && (
            <div className="hce-grid">
              <Panel
                title="Stats Section"
                subtitle="Numbers shown in the impact bar"
                icon={<IconBars />}
                full
                action={
                  <button className="btn btn-secondary btn-sm" type="button"
                    onClick={() => addArrayItem("stats", { id: `stat_${Date.now()}`, count: 0, suffix: "+", label: "New Stat", delay: "" })}>
                    <IconPlus /> Add Stat
                  </button>
                }
              >
                {arrayValue(content.stats).length === 0 && (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">📊</div>
                    <p>No stats added yet.</p>
                  </div>
                )}
                <div className="hce-array-list">
                  {arrayValue(content.stats).map((stat, index) => (
                    <div className="hce-array-row stats-row" key={stat.id || index}>
                      <input className="hce-plain-input" placeholder="ID (e.g. events)" value={stat.id || ""} onChange={(e) => updateArrayItem("stats", index, "id", e.target.value)} />
                      <input className="hce-plain-input" type="number" placeholder="Count" value={stat.count || 0} onChange={(e) => updateArrayItem("stats", index, "count", Number(e.target.value))} />
                      <input className="hce-plain-input" placeholder="Suffix (e.g. +)" value={stat.suffix || ""} onChange={(e) => updateArrayItem("stats", index, "suffix", e.target.value)} />
                      <input className="hce-plain-input" placeholder="Label (e.g. Events Hosted)" value={stat.label || ""} onChange={(e) => updateArrayItem("stats", index, "label", e.target.value)} />
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeArrayItem("stats", index)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ══════════ CALENDAR TAB ══════════ */}
          {activeTab === "calendar" && (
            <div className="hce-grid">
              <Panel title="Calendar Section Text" subtitle="Headlines and description copy" icon={<IconCalendar />}>
                <Field label="Eyebrow" value={content.calendar_section.eyebrow} onChange={(v) => updateField("calendar_section.eyebrow", v)} />
                <Field label="Title" value={content.calendar_section.title} onChange={(v) => updateField("calendar_section.title", v)} />
                <TextArea label="Description" value={content.calendar_section.description} onChange={(v) => updateField("calendar_section.description", v)} />
                <Field label="Loading Text" value={content.calendar_section.loading_text} onChange={(v) => updateField("calendar_section.loading_text", v)} />
              </Panel>

              <Panel title="Calendar Buttons & Legend" subtitle="UI labels and status colors" icon={<IconEdit />}>
                <div className="hce-three-col">
                  <Field label="Today Button" value={content.calendar_section.button_today} onChange={(v) => updateField("calendar_section.button_today", v)} />
                  <Field label="Month Button" value={content.calendar_section.button_month} onChange={(v) => updateField("calendar_section.button_month", v)} />
                  <Field label="Year View" value={content.calendar_section.button_year_view} onChange={(v) => updateField("calendar_section.button_year_view", v)} />
                </div>

                <div className="hce-section-divider">
                  <div className="hce-section-divider-line" />
                  <span className="hce-section-divider-text">Legend Items</span>
                  <div className="hce-section-divider-line" />
                </div>

                <div className="hce-array-list">
                  {arrayValue(content.calendar_section.legend).map((item, index) => (
                    <div className="hce-array-row two" key={`${item.label}-${index}`}>
                      <input className="hce-plain-input" placeholder="Label" value={item.label || ""} onChange={(e) => updateArrayItem("calendar_section.legend", index, "label", e.target.value)} />
                      <input className="hce-plain-input" placeholder="Color (e.g. #22c55e)" value={item.color || ""} onChange={(e) => updateArrayItem("calendar_section.legend", index, "color", e.target.value)} />
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeArrayItem("calendar_section.legend", index)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ══════════ FEATURES TAB ══════════ */}
          {activeTab === "features" && (
            <div className="hce-grid">
              <Panel title="Features Section Text" subtitle="Section headline and intro copy" icon={<IconEdit />}>
                <Field label="Eyebrow" value={content.features_section.eyebrow} onChange={(v) => updateField("features_section.eyebrow", v)} />
                <Field label="Title" value={content.features_section.title} onChange={(v) => updateField("features_section.title", v)} />
                <TextArea label="Description" value={content.features_section.description} onChange={(v) => updateField("features_section.description", v)} />
              </Panel>

              <Panel
                title="Feature Cards"
                subtitle="Individual feature highlights"
                icon={<IconFile />}
                full
                action={
                  <button className="btn btn-secondary btn-sm" type="button"
                    onClick={() => addArrayItem("features_section.cards", { id: `feature_${Date.now()}`, icon: "⭐", title: "New Feature", text: "Feature description", delay: "" })}>
                    <IconPlus /> Add Feature
                  </button>
                }
              >
                {arrayValue(content.features_section.cards).length === 0 && (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">⭐</div>
                    <p>No feature cards yet. Click "Add Feature" to begin.</p>
                  </div>
                )}

                {arrayValue(content.features_section.cards).map((card, index) => (
                  <div className="hce-feature-card" key={card.id || index}>
                    <div className="hce-feature-card-header">
                      <div className="hce-feature-card-num">
                        <div className="hce-feature-num-badge">{index + 1}</div>
                        <span className="hce-feature-card-label">Feature Card</span>
                      </div>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeArrayItem("features_section.cards", index)}>
                        <IconTrash /> Remove
                      </button>
                    </div>
                    <div className="hce-two-col">
                      <Field label="Icon (emoji)" value={card.icon} onChange={(v) => updateArrayItem("features_section.cards", index, "icon", v)} placeholder="⭐" />
                      <Field label="Title" value={card.title} onChange={(v) => updateArrayItem("features_section.cards", index, "title", v)} />
                    </div>
                    <TextArea label="Description Text" value={card.text} onChange={(v) => updateArrayItem("features_section.cards", index, "text", v)} rows={3} />
                  </div>
                ))}
              </Panel>
            </div>
          )}

          {/* ══════════ CTA TAB ══════════ */}
          {activeTab === "cta" && (
            <div className="hce-grid">
              <Panel title="CTA Section Content" subtitle="Booking call-to-action copy & links" icon={<IconEdit />}>
                <div className="hce-three-col">
                  <Field label="Title" value={content.booking_cta.title} onChange={(v) => updateField("booking_cta.title", v)} />
                  <Field label="Highlight" value={content.booking_cta.highlight} onChange={(v) => updateField("booking_cta.highlight", v)} />
                  <Field label="Title Suffix" value={content.booking_cta.title_suffix} onChange={(v) => updateField("booking_cta.title_suffix", v)} />
                </div>
                <TextArea label="Description" value={content.booking_cta.description} onChange={(v) => updateField("booking_cta.description", v)} />
                <div className="hce-section-divider">
                  <div className="hce-section-divider-line" />
                  <span className="hce-section-divider-text">Buttons</span>
                  <div className="hce-section-divider-line" />
                </div>
                <div className="hce-two-col">
                  <Field label="Primary Button Text" value={content.booking_cta.primary_button_text} onChange={(v) => updateField("booking_cta.primary_button_text", v)} />
                  <Field label="Primary Button Link" value={content.booking_cta.primary_button_link} onChange={(v) => updateField("booking_cta.primary_button_link", v)} />
                </div>
                <div className="hce-two-col">
                  <Field label="Secondary Button Text" value={content.booking_cta.secondary_button_text} onChange={(v) => updateField("booking_cta.secondary_button_text", v)} />
                  <Field label="Secondary Button Link" value={content.booking_cta.secondary_button_link} onChange={(v) => updateField("booking_cta.secondary_button_link", v)} />
                </div>
              </Panel>

              <Panel title="CTA Background Image" subtitle="Full-width background photo" icon={<IconImage />}>
                <div className="hce-image-zone medium">
                  {content.booking_cta.background_image ? (
                    <img key={`cta-${previewVersion}`} src={adminPreviewUrl(content.booking_cta.background_image, previewVersion)} alt="CTA background" />
                  ) : (
                    <div className="hce-image-placeholder">
                      <div className="hce-image-placeholder-icon">🚀</div>
                      <p>No image uploaded yet</p>
                      <small>Recommended: 1920×600px</small>
                    </div>
                  )}
                </div>
                <label className="hce-file-input-wrapper">
                  <IconUpload /> Choose CTA Background
                  <input type="file" accept="image/*" onChange={(e) => uploadSectionImage("booking_cta_background", e.target.files?.[0])} />
                </label>
              </Panel>
            </div>
          )}

          {/* ══════════ FOOTER TAB ══════════ */}
          {activeTab === "footer" && (
            <div className="hce-grid">
              <Panel title="Footer Brand" subtitle="Logo, description and tagline" icon={<IconEdit />}>
                <Field label="Footer Logo Path" value={content.footer.logo} onChange={(v) => updateField("footer.logo", v)} />
                <label className="hce-file-input-wrapper" style={{ marginBottom: 16 }}>
                  <IconUpload /> Replace Footer Logo
                  <input type="file" accept="image/*" onChange={(e) => uploadSectionImage("footer_logo", e.target.files?.[0])} />
                </label>
                <Field label="Logo Alt" value={content.footer.logo_alt} onChange={(v) => updateField("footer.logo_alt", v)} />
                <TextArea label="Description" value={content.footer.description} onChange={(v) => updateField("footer.description", v)} />
              </Panel>

              <Panel title="Footer Contact" subtitle="Address, phone, email & copyright" icon={<IconFile />}>
                <Field label="Contact Title" value={content.footer.contact_title} onChange={(v) => updateField("footer.contact_title", v)} />
                <Field label="Address" value={content.footer.address} onChange={(v) => updateField("footer.address", v)} />
                <div className="hce-two-col">
                  <Field label="Phone" value={content.footer.phone} onChange={(v) => updateField("footer.phone", v)} />
                  <Field label="Email" value={content.footer.email} onChange={(v) => updateField("footer.email", v)} />
                </div>
                <div className="hce-section-divider">
                  <div className="hce-section-divider-line" />
                  <span className="hce-section-divider-text">Bottom Bar</span>
                  <div className="hce-section-divider-line" />
                </div>
                <Field label="Copyright Text" value={content.footer.copyright} onChange={(v) => updateField("footer.copyright", v)} />
                <Field label="Copyright Brand" value={content.footer.copyright_brand} onChange={(v) => updateField("footer.copyright_brand", v)} />
                <Field label="Tagline" value={content.footer.tagline} onChange={(v) => updateField("footer.tagline", v)} />
              </Panel>

              <Panel
                title="Footer Quick Links"
                subtitle="Links shown in the footer column"
                icon={<IconPlus />}
                full
                action={
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => addArrayItem("footer.quick_links", { label: "New Link", href: "#" })}>
                    <IconPlus /> Add Link
                  </button>
                }
              >
                {arrayValue(content.footer.quick_links).length === 0 && (
                  <div className="hce-empty">
                    <div className="hce-empty-icon">📋</div>
                    <p>No quick links added yet.</p>
                  </div>
                )}
                <div className="hce-array-list">
                  {arrayValue(content.footer.quick_links).map((link, index) => (
                    <div className="hce-array-row two" key={`${link.label}-${index}`}>
                      <input className="hce-plain-input" placeholder="Label" value={link.label || ""} onChange={(e) => updateArrayItem("footer.quick_links", index, "label", e.target.value)} />
                      <input className="hce-plain-input" placeholder="URL / href" value={link.href || ""} onChange={(e) => updateArrayItem("footer.quick_links", index, "href", e.target.value)} />
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeArrayItem("footer.quick_links", index)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ══════════ ADVANCED JSON TAB ══════════ */}
          {activeTab === "advanced" && (
            <div className="hce-grid">
              <Panel title="Advanced JSON Editor" subtitle="Directly edit the raw homepage-content.json structure" icon={<IconFile />} full>
                <div className="hce-hint">
                  <span>⚠️</span>
                  Use this only for advanced edits. After applying, click <strong>"Save All Changes"</strong> to persist to hosting.
                </div>

                <div className="hce-json-wrapper">
                  <div className="hce-json-topbar">
                    <div className="hce-json-dots">
                      <div className="hce-json-dot" />
                      <div className="hce-json-dot" />
                      <div className="hce-json-dot" />
                    </div>
                    <span className="hce-json-filename">homepage-content.json</span>
                    <div style={{ width: 52 }} />
                  </div>
                  <textarea
                    className="hce-json-editor"
                    value={advancedJson}
                    onChange={(e) => setAdvancedJson(e.target.value)}
                    spellCheck={false}
                  />
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(advancedJson);
                        setContent(mergeContent(parsed));
                        setMessage({ type: "success", text: "JSON applied locally. Click Save All Changes to update hosting JSON." });
                      } catch {
                        setMessage({ type: "error", text: "Invalid JSON format. Please check your syntax and try again." });
                      }
                    }}
                  >
                    <IconCheck /> Apply JSON Locally
                  </button>
                  <button className="btn btn-primary" type="button" onClick={() => saveContent()} disabled={isSaving}>
                    <IconSave />
                    {isSaving ? "Saving…" : "Save to Hosting"}
                  </button>
                </div>
              </Panel>
            </div>
          )}

        </div>
      </main>
    </>
  );
}