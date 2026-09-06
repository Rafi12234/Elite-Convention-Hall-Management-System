import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { apiRequest, adminHeaders } from "../../services/api";
import Sidebar from "../../components/Sidebar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

const manualBookingStyles = String.raw`
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
    --orange: #fd7e14;
    --gray: #6c757d;
    --shadow: 0 4px 24px rgba(0,0,0,0.07);
    --shadow-hover: 0 12px 40px rgba(184,134,11,0.18);
    --transition: 0.32s cubic-bezier(0.4,0,0.2,1);
    --radius: 20px;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: rgba(184,134,11,0.3); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--gold); }

  body {
    font-family: 'Poppins', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    animation: bodyFade 0.45s ease both;
  }

  body.admin-layout {
    overflow-x: hidden;
  }

  @keyframes bodyFade {
    from { opacity:0; }
    to { opacity:1; }
  }

  .admin-main {
    margin-left: 286px;
    min-height: 100vh;
  }

  .container {
    width: 92%;
    max-width: 1300px;
    margin: auto;
    padding: 36px 0 60px;
  }

  .page-header {
    margin-bottom: 26px;
    animation: fadeDown 0.55s 0.1s both;
  }

  .page-title h1 {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }

  .muted {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.7;
  }

  .info-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    background: rgba(184,134,11,0.06);
    border: 1px solid rgba(184,134,11,0.18);
    border-radius: 14px;
    margin-top: 12px;
    animation: fadeDown 0.5s 0.2s both;
  }

  .info-banner svg {
    color: var(--gold);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-banner p {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
  }

  .message-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 18px;
    border-radius: 14px;
    font-size: 13.5px;
    font-weight: 600;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.4s cubic-bezier(0.4,0,0.2,1),
      padding 0.4s cubic-bezier(0.4,0,0.2,1),
      opacity 0.3s ease,
      margin 0.4s ease;
    margin-bottom: 0;
    white-space: pre-line;
  }

  .message-banner.visible {
    max-height: 120px;
    padding: 14px 18px;
    opacity: 1;
    margin-bottom: 22px;
  }

  .message-banner.error {
    background: rgba(220,53,69,0.08);
    border: 1px solid rgba(220,53,69,0.22);
    color: var(--red);
  }

  .message-banner.success {
    background: rgba(25,135,84,0.08);
    border: 1px solid rgba(25,135,84,0.22);
    color: var(--green);
  }

  .main-grid {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 22px;
  }

  .panel {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: 24px;
    box-shadow: var(--shadow);
    padding: 28px;
    transition: box-shadow var(--transition);
    animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
    position: relative;
    overflow: hidden;
  }

  .panel:hover { box-shadow: var(--shadow-hover); }

  .panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    opacity: 0;
    transition: opacity var(--transition);
  }

  .panel:hover::before { opacity: 1; }
  .panel:nth-child(1) { animation-delay: 0.15s; }
  .panel:nth-child(2) { animation-delay: 0.22s; }

  .panel-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(234,215,166,0.5);
  }

  .panel-heading-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px var(--gold-glow);
    color: white;
  }

  .panel-heading h2 {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    font-weight: 800;
    color: var(--gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin: 22px 0 14px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--gold-border), transparent);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .field {
    margin-bottom: 16px;
  }

  .field label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--gold-dark);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
    transition: color var(--transition);
  }

  .field label .req { color: var(--red); }
  .field:focus-within label { color: var(--gold); }

  .input-wrap {
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
    transition: color var(--transition);
  }

  .field:focus-within .input-icon { color: var(--gold); }

  input, select, textarea {
    width: 100%;
    padding: 12px 14px 12px 42px;
    border: 1.5px solid #e1dfd8;
    border-radius: 14px;
    background: #fffdf9;
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    outline: none;
    transition:
      border-color var(--transition),
      box-shadow var(--transition),
      background var(--transition),
      transform var(--transition);
  }

  input.no-icon, select.no-icon, textarea.no-icon {
    padding-left: 14px;
  }

  input::placeholder,
  textarea::placeholder {
    color: #c0bdb5;
    font-weight: 300;
  }

  input:hover,
  select:hover,
  textarea:hover {
    border-color: rgba(184,134,11,0.4);
    background: #fff;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--gold);
    background: #fff;
    box-shadow: 0 0 0 4px var(--gold-glow);
    transform: translateY(-1px);
  }

  textarea {
    min-height: 104px;
    resize: vertical;
    padding: 14px;
  }

  textarea:focus {
    transform: none;
  }

  .password-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .password-row input {
    flex: 1;
  }

  .btn-generate {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 6px 18px var(--gold-glow);
    transition: transform var(--transition), box-shadow var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-generate:hover {
    transform: translateY(-2px) rotate(30deg);
    box-shadow: 0 10px 26px var(--gold-glow);
  }

  .slot-box {
    border: 1.5px dashed rgba(184,134,11,0.35);
    border-radius: 16px;
    background: var(--gold-pale);
    padding: 16px;
    margin-top: 10px;
    color: var(--gold-dark);
    font-weight: 600;
    font-size: 13px;
    line-height: 1.7;
    transition: all var(--transition);
    animation: pulseBox 2.5s ease-in-out infinite;
  }

  .slot-box.selected {
    border-style: solid;
    border-color: var(--gold);
    background: linear-gradient(135deg, rgba(184,134,11,0.1), rgba(212,160,23,0.06));
    animation: none;
  }

  @keyframes pulseBox {
    0%,100% { border-color: rgba(184,134,11,0.25); }
    50% { border-color: rgba(184,134,11,0.55); }
  }

  .slot-box-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 800;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .slot-box-clear {
    margin-left: auto;
    background: none;
    border: 1px solid rgba(184,134,11,0.3);
    color: var(--gold-dark);
    border-radius: 8px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all var(--transition);
  }

  .slot-box-clear:hover {
    background: var(--gold);
    color: white;
    border-color: var(--gold);
  }

  .amount-card {
    background: linear-gradient(135deg, rgba(184,134,11,0.06), #fff);
    border: 1px solid var(--gold-border);
    border-radius: 18px;
    padding: 18px 20px;
    margin: 10px 0 18px;
  }

  .amount-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    font-size: 14px;
    border-bottom: 1px solid rgba(234,215,166,0.4);
  }

  .amount-line:last-child { border-bottom: none; }
  .amount-line span { color: var(--muted); font-weight: 500; }
  .amount-line strong { color: var(--gold-dark); font-weight: 800; font-size: 15px; }
  .amount-line.due strong { color: var(--red); }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: none;
    cursor: pointer;
    border-radius: 14px;
    padding: 14px 22px;
    font-family: inherit;
    font-weight: 700;
    font-size: 14px;
    position: relative;
    overflow: hidden;
    transition: transform var(--transition), box-shadow var(--transition);
  }

  .btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%);
    transform: skewX(-20deg) translateX(-150%);
    transition: transform 0.6s ease;
  }

  .btn:hover::before { transform: skewX(-20deg) translateX(250%); }
  .btn:hover { transform: translateY(-2px); }
  .btn:active { transform: translateY(0); }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  .btn-primary {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    box-shadow: 0 8px 24px var(--gold-glow);
  }

  .btn-primary:hover {
    box-shadow: 0 12px 32px var(--gold-glow);
  }

  .btn-secondary {
    background: var(--white);
    color: var(--gold-dark);
    border: 1.5px solid var(--gold-border);
  }

  .btn-secondary:hover {
    border-color: var(--gold);
    background: var(--gold-pale);
  }

  .btn-spinner {
    width: 16px;
    height: 16px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: none;
  }

  .btn.loading .btn-spinner { display: block; }
  .btn.loading .btn-label { opacity: 0.75; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 22px;
  }

  .admin-calendar {
    background: white;
    border: 1px solid var(--gold-border);
    border-radius: 18px;
    padding: 18px;
    box-shadow: var(--shadow);
    margin-top: 12px;
    margin-bottom: 16px;
    transition: box-shadow var(--transition);
  }

  .admin-calendar:hover { box-shadow: var(--shadow-hover); }

  .admin-calendar .fc-toolbar-title {
    font-size: 20px !important;
    color: var(--text) !important;
    font-weight: 800 !important;
  }

  .admin-calendar .fc-button-primary {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold)) !important;
    border-color: transparent !important;
    border-radius: 10px !important;
    font-family: inherit !important;
    font-weight: 700 !important;
    box-shadow: none !important;
    transition: opacity 0.2s !important;
  }

  .admin-calendar .fc-button-primary:hover { opacity: 0.85 !important; }
  .admin-calendar .fc-button-primary:disabled { opacity: 0.45 !important; }
  .admin-calendar .fc-daygrid-day { cursor: pointer; transition: background 0.2s; }
  .admin-calendar .fc-daygrid-day:hover { background: rgba(184,134,11,0.05) !important; }

  .admin-calendar .fc-daygrid-event {
    border-radius: 8px !important;
    padding: 3px 7px;
    font-size: 11px;
    font-weight: 700;
    border: none !important;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .admin-calendar .fc-daygrid-event:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .calendar-legend {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 10px;
    font-size: 12px;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--muted);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }

  .legend-dot.available { background: var(--green); }
  .legend-dot.booked { background: var(--red); }
  .legend-dot.progress { background: var(--orange); }
  .legend-dot.blocked { background: var(--gray); }

  .slot-popup {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .slot-popup.show {
    display: flex;
    animation: backdropIn 0.3s ease both;
  }

  @keyframes backdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .slot-popup-card {
    width: 100%;
    max-width: 560px;
    background: var(--white);
    border-radius: 24px;
    border: 1px solid var(--gold-border);
    box-shadow: 0 24px 80px rgba(0,0,0,0.28);
    padding: 28px;
    position: relative;
    animation: popupIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
    overflow: hidden;
  }

  .slot-popup-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--gold), var(--gold-light), var(--gold), transparent);
    background-size: 200% 100%;
    animation: shimmer 2.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { background-position: -100% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes popupIn {
    from { opacity: 0; transform: translateY(30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .slot-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-right: 8px;
  }

  .slot-popup-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .slot-popup-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px var(--gold-glow);
  }

  .slot-popup-title h3 {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
  }

  .slot-popup-date {
    font-size: 13px;
    color: var(--muted);
    font-weight: 500;
  }

  .slot-popup-close {
    width: 36px;
    height: 36px;
    border: 1.5px solid var(--gold-border);
    background: var(--gold-pale);
    color: var(--gold-dark);
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    flex-shrink: 0;
  }

  .slot-popup-close:hover {
    background: var(--red);
    border-color: var(--red);
    color: white;
    transform: rotate(90deg);
  }

  .slot-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .slot-choice {
    width: 100%;
    padding: 16px 18px;
    border-radius: 16px;
    border: 1.5px solid var(--gold-border);
    background: white;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition);
    position: relative;
    overflow: hidden;
    animation: fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both;
  }

  .slot-choice.available {
    border-color: rgba(25,135,84,0.35);
    background: rgba(25,135,84,0.05);
  }

  .slot-choice.available:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(25,135,84,0.15);
    border-color: rgba(25,135,84,0.6);
  }

  .slot-choice.unavailable {
    opacity: 0.55;
    cursor: not-allowed;
    background: #f8f8f8;
  }

  .slot-choice-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .slot-choice-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 5px;
  }

  .slot-choice-meta {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
  }

  .slot-choice-amount {
    font-size: 15px;
    font-weight: 800;
    color: var(--gold-dark);
    white-space: nowrap;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: capitalize;
    margin-top: 8px;
  }

  .status-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-pill.available { background: rgba(25,135,84,0.12); color: var(--green); }
  .status-pill.available .status-pill-dot { background: var(--green); }
  .status-pill.booked { background: rgba(220,53,69,0.12); color: var(--red); }
  .status-pill.booked .status-pill-dot { background: var(--red); }
  .status-pill.payment_in_progress { background: rgba(253,126,20,0.14); color: var(--orange); }
  .status-pill.payment_in_progress .status-pill-dot { background: var(--orange); }
  .status-pill.blocked { background: rgba(108,117,125,0.14); color: var(--gray); }
  .status-pill.blocked .status-pill-dot { background: var(--gray); }

  .result-card {
    display: none;
    border: 1px solid rgba(25,135,84,0.25);
    background: rgba(25,135,84,0.05);
    border-radius: 20px;
    padding: 24px;
    margin-top: 22px;
    animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }

  .result-card.show {
    display: block;
  }

  .result-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(25,135,84,0.15);
  }

  .result-card-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--green);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 6px 16px rgba(25,135,84,0.3);
  }

  .result-card-header h3 {
    font-size: 17px;
    font-weight: 700;
    color: var(--green);
  }

  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .result-item {
    background: white;
    border-radius: 14px;
    padding: 14px 16px;
    border: 1px solid rgba(25,135,84,0.12);
    transition: transform var(--transition);
  }

  .result-item:hover { transform: translateY(-2px); }

  .result-item strong {
    display: block;
    color: var(--muted);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 5px;
    font-weight: 700;
  }

  .result-item span {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .result-actions {
    display: flex;
    gap: 12px;
    margin-top: 18px;
  }

  @keyframes fadeDown {
    from { opacity:0; transform: translateY(-16px); }
    to { opacity:1; transform: translateY(0); }
  }

  @keyframes fadeUp {
    from { opacity:0; transform: translateY(20px); }
    to { opacity:1; transform: translateY(0); }
  }

  .admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
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
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    padding: 8px 8px 18px;
    border-bottom: 1px solid var(--gold-border);
  }

  .sidebar-brand img {
    width: 154px;
    max-width: 100%;
    height: auto;
    display: block;
  }

  .sidebar-title {
    display: block;
    margin-top: 6px;
    color: var(--gold-dark);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.3px;
  }

  .sidebar-admin-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--gold-pale), rgba(255,255,255,0.9));
    border: 1px solid var(--gold-border);
  }

  .admin-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .sidebar-admin-meta { min-width: 0; }

  .sidebar-admin-label {
    display: block;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 3px;
  }

  .sidebar-admin-name {
    display: block;
    color: var(--gold-dark);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .sidebar-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
  }

  .sidebar-section-title {
    margin: 8px 10px 4px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.9px;
  }

  .sidebar-link,
  .sidebar-logout {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 16px;
    text-decoration: none;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    transition: all var(--transition);
  }

  .sidebar-link {
    color: var(--muted);
    background: transparent;
  }

  .sidebar-link svg,
  .sidebar-logout svg {
    flex-shrink: 0;
  }

  .sidebar-link:hover {
    color: var(--gold-dark);
    background: var(--gold-pale);
    border-color: var(--gold-border);
    transform: translateX(3px);
  }

  .sidebar-link.active {
    color: white;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    box-shadow: 0 10px 26px rgba(184,134,11,0.26);
  }

  .sidebar-footer {
    padding-top: 14px;
    border-top: 1px solid var(--gold-border);
  }

  .sidebar-logout {
    cursor: pointer;
    justify-content: center;
    color: white;
    background: linear-gradient(135deg, #c0392b, var(--red));
    box-shadow: 0 8px 22px rgba(220,53,69,0.2);
  }

  .sidebar-logout:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(220,53,69,0.32);
  }

  .admin-mobile-topbar {
    display: none;
    position: sticky;
    top: 0;
    z-index: 450;
    height: 64px;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--gold-border);
    padding: 0 16px;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 18px rgba(0,0,0,0.05);
  }

  .sidebar-toggle {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid var(--gold-border);
    background: var(--gold-pale);
    color: var(--gold-dark);
    font-size: 22px;
    cursor: pointer;
    font-weight: 800;
  }

  .admin-mobile-topbar img {
    height: 36px;
  }

  .sidebar-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 480;
  }

  .sidebar-backdrop.show {
    display: block;
  }

  @media (max-width: 980px) {
    .admin-sidebar {
      transform: translateX(-110%);
      transition: transform var(--transition);
    }

    .admin-sidebar.open {
      transform: translateX(0);
    }

    .admin-main {
      margin-left: 0;
    }

    .admin-mobile-topbar {
      display: flex;
    }
  }

  @media (max-width: 900px) {
    .main-grid { grid-template-columns: 1fr; }
    .form-row { grid-template-columns: 1fr; }
    .result-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 600px) {
    .container { padding: 20px 0 40px; }
    .page-title h1 { font-size: 26px; }
    .admin-calendar { padding: 10px; }
    .actions { flex-direction: column; }
    .btn { width: 100%; }
  }
`;

const initialForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_address: "",
  password: "",
  event_title: "",
  event_type: "",
  guest_count: "",
  event_details: "",
  payment_method: "cash",
  paid_amount: "0",
  payment_note: "",
};

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function getStoredAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildAdminHeaders() {
  const token = getAdminToken();

  let helperHeaders = {};

  try {
    helperHeaders = typeof adminHeaders === "function" ? adminHeaders(token) : {};
  } catch {
    try {
      helperHeaders = typeof adminHeaders === "function" ? adminHeaders() : {};
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

function normalizeApiData(payload) {
  return payload?.data !== undefined ? payload.data : payload;
}

async function requestAdminApi(endpoint, options = {}) {
  const token = getAdminToken();

  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const headers = {
    ...buildAdminHeaders(),
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

  if (response.status === 401 || response.status === 403) {
    const error = new Error(result.message || "Unauthorized");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const validationErrors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    throw new Error(result.error || validationErrors || result.message || "Request failed.");
  }

  return result;
}

async function requestPublicApi(endpoint, options = {}) {
  if (typeof apiRequest === "function") {
    return apiRequest(endpoint, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    throw new Error(result.error || validationErrors || result.message || "Request failed.");
  }

  return result;
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString()}`;
}

function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatStatus(status) {
  return String(status || "unknown").replaceAll("_", " ");
}

function getSlotAmount(slot) {
  if (!slot) return 0;

  return Number(slot.price || slot.shift_price || slot.total_amount || 0);
}

function getSlotColor(slot) {
  const status = String(slot?.slot_status || "").toLowerCase();

  if (status === "booked") return "#dc3545";
  if (status === "blocked") return "#6c757d";
  if (status === "payment_in_progress") return "#fd7e14";
  if (status === "pending_approval") return "#b8860b";

  return "#198754";
}

function buildSlotEvent(slot) {
  const color = getSlotColor(slot);
  const title = slot.calendar_title || `${slot.shift_name || "Shift"} ${formatStatus(slot.slot_status)}`;

  return {
    id: String(slot.slot_id),
    title,
    start: normalizeDate(slot.slot_date),
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    textColor: "#fff",
    extendedProps: { slot },
  };
}

function generateRandomPassword(length = 12) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  const syms = "@#$%&*!?";
  const all = upper + lower + nums + syms;

  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    syms[Math.floor(Math.random() * syms.length)];

  for (let index = password.length; index < length; index += 1) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function IconUser({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconPhone({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.63 18 19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.21 3.4 2 2 0 0 1 3.18 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMail({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconLocation({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconLock({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconRefresh({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconEdit({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconInfo({ className = "", size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconUsers({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar({ className = "", size = 17 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconHome({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconCard({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconMoney({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconFile({ className = "", size = 15 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconCheck({ className = "", size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconClose({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconBars({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconPlus({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AdminManualBookingPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [form, setForm] = useState(() => ({
    ...initialForm,
    password: generateRandomPassword(),
  }));
  const [halls, setHalls] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState("");
  const [slotsByDate, setSlotsByDate] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotPopup, setSlotPopup] = useState({
    open: false,
    date: "",
    slots: [],
  });
  const [message, setMessage] = useState({
    text: "",
    type: "error",
    visible: false,
  });
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(true);


  const adminName = admin?.name || "Admin";
  const adminEmail = admin?.email || "—";
  const adminType = admin?.user_type || "—";


  const totalAmount = getSlotAmount(selectedSlot);
  const paidAmount = Math.max(Number(form.paid_amount || 0), 0);
  const dueAmount = Math.max(totalAmount - paidAmount, 0);

  const showMessage = useCallback((text, type = "error") => {
    setMessage({
      text,
      type,
      visible: true,
    });

    window.setTimeout(() => {
      const messageBox = document.querySelector(".message-banner.visible");
      if (messageBox) {
        messageBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 50);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage({
      text: "",
      type: "error",
      visible: false,
    });
  }, []);

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    navigate("/admin-login");
  }, [navigate]);

  const handleAdminError = useCallback(
    (error, fallbackMessage) => {
      if (
        error?.status === 401 ||
        error?.status === 403 ||
        String(error?.message || "").toLowerCase().includes("unauthorized")
      ) {
        redirectToLogin();
        return;
      }

      showMessage(error.message || fallbackMessage, "error");
    },
    [redirectToLogin, showMessage]
  );

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const paymentStatus = useCallback(() => {
    if (paidAmount <= 0) return "pending";
    if (paidAmount < totalAmount) return "partial";
    return "success";
  }, [paidAmount, totalAmount]);

  const validateForm = useCallback(() => {
    if (!selectedSlot?.slot_id) {
      throw new Error("Please select an available slot from the calendar first.");
    }

    if (paidAmount < 0) {
      throw new Error("Paid amount cannot be negative.");
    }

    if (paidAmount > totalAmount) {
      throw new Error("Paid amount cannot be greater than total amount.");
    }

    if (!form.customer_email.trim()) {
      throw new Error("Customer email is required.");
    }

    if (!form.password.trim() || form.password.trim().length < 8) {
      throw new Error("Please generate a valid temporary password.");
    }
  }, [form.customer_email, form.password, paidAmount, selectedSlot, totalAmount]);

  const loadContext = useCallback(async () => {
    setIsContextLoading(true);

    try {
      const resultData = await requestPublicApi("/booking-context", {
        method: "GET",
      });

      const data = normalizeApiData(resultData) || {};
      const hallRows = Array.isArray(data.halls) ? data.halls : [];

      if (!hallRows.length) {
        throw new Error("No hall found. Please add hall data first.");
      }

      setHalls(hallRows);

      const defaultHallId = data.default_hall_id || hallRows[0]?.id || "";
      setSelectedHallId(String(defaultHallId));
    } catch (error) {
      showMessage(error.message || "Unable to load booking context.", "error");
    } finally {
      setIsContextLoading(false);
    }
  }, [showMessage]);

  const loadCalendarSlots = useCallback(
    async (fetchInfo, successCallback, failureCallback) => {
      if (!selectedHallId) {
        successCallback([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          hall_id: selectedHallId,
          from: normalizeDate(fetchInfo.startStr),
          to: normalizeDate(fetchInfo.endStr),
        });

        const resultData = await requestPublicApi(`/calendar-slots?${params.toString()}`, {
          method: "GET",
        });

        const slots = normalizeApiData(resultData) || [];
        const grouped = slots.reduce((accumulator, slot) => {
          const date = normalizeDate(slot.slot_date);
          if (!accumulator[date]) accumulator[date] = [];
          accumulator[date].push(slot);
          return accumulator;
        }, {});

        setSlotsByDate(grouped);
        successCallback(slots.map(buildSlotEvent));
      } catch (error) {
        failureCallback(error);
        showMessage(error.message || "Unable to load calendar slots.", "error");
      }
    },
    [selectedHallId, showMessage]
  );

  const openSlotPopup = useCallback(
    (date) => {
      const normalized = normalizeDate(date);
      const slots = (slotsByDate[normalized] || [])
        .slice()
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

      setSlotPopup({
        open: true,
        date: normalized,
        slots,
      });
    },
    [slotsByDate]
  );

  const closeSlotPopup = useCallback(() => {
    setSlotPopup({
      open: false,
      date: "",
      slots: [],
    });
  }, []);

  const chooseSlot = useCallback(
    (slot) => {
      setSelectedSlot(slot);
      closeSlotPopup();
      clearMessage();
    },
    [clearMessage, closeSlotPopup]
  );

  const clearSlot = useCallback(() => {
    setSelectedSlot(null);
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      ...initialForm,
      password: generateRandomPassword(),
    });
    setSelectedSlot(null);
    setResult(null);
    clearMessage();
  }, [clearMessage]);

  const submitManualBooking = useCallback(
    async (event) => {
      event.preventDefault();
      clearMessage();

      try {
        validateForm();
      } catch (error) {
        showMessage(error.message, "error");
        return;
      }

      setIsSubmitting(true);

      try {
        const payload = {
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_address: form.customer_address.trim() || null,
          password: form.password.trim(),
          hall_id: Number(selectedHallId),
          booking_slot_id: Number(selectedSlot.slot_id),
          event_title: form.event_title.trim(),
          event_type: form.event_type.trim(),
          event_details: form.event_details.trim() || null,
          guest_count: Number(form.guest_count),
          payment_method: form.payment_method,
          paid_amount: Number(form.paid_amount || 0),
          payment_status: paymentStatus(),
          payment_note: form.payment_note.trim() || null,
        };

        const response = await requestAdminApi("/admin/manual-bookings", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const data = normalizeApiData(response) || {};
        const booking = data.booking || {};
        const dueAmt = data.due_amount || 0;

        setResult({
          booking_no: booking.booking_no || "—",
          customer: booking.customer_name || payload.customer_name || "—",
          date_shift: `${booking.slot_date || selectedSlot.slot_date || "—"} · ${
            booking.shift_name || selectedSlot.shift_name || "—"
          }`,
          total_amount: money(booking.total_amount || getSlotAmount(selectedSlot)),
          paid_amount: money(booking.paid_amount || payload.paid_amount),
          due_amount: money(dueAmt),
        });

        showMessage("Manual booking created successfully.", "success");
        setSelectedSlot(null);

        window.setTimeout(() => {
          const resultCard = document.querySelector(".result-card.show");
          if (resultCard) {
            resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 80);
      } catch (error) {
        handleAdminError(error, "Unable to create manual booking.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      clearMessage,
      form.customer_address,
      form.customer_email,
      form.customer_name,
      form.customer_phone,
      form.event_details,
      form.event_title,
      form.event_type,
      form.guest_count,
      form.paid_amount,
      form.password,
      form.payment_method,
      form.payment_note,
      handleAdminError,
      paymentStatus,
      selectedHallId,
      selectedSlot,
      showMessage,
      validateForm,
    ]
  );


  useEffect(() => {
    if (!getAdminToken()) {
      redirectToLogin();
      return;
    }

    document.body.classList.add("admin-layout");

    const storedAdmin = getStoredAdmin();
    if (storedAdmin) setAdmin(storedAdmin);

    loadContext();

    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, [loadContext, redirectToLogin]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeSlotPopup();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeSlotPopup]);

  return (
    <>
      <style>{manualBookingStyles}</style>

      <Sidebar admin={admin} />

      <main className="admin-main">
        <div className="admin-mobile-topbar">
          <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
        </div>

        <div className="container">
          <div className="page-header">
            <div className="page-title">
              <h1>Manual Booking</h1>
              <p className="muted">
                {adminName || "Admin"} · {adminEmail} · {adminType}
              </p>

              <div className="info-banner">
                <IconInfo />
                <p>
                  Use this page when a customer visits the DLC office physically. The system will create a customer
                  login profile, generate a temporary password, create the booking, and send login details by email.
                </p>
              </div>
            </div>
          </div>

          <div className={`message-banner ${message.type} ${message.visible ? "visible" : ""}`.trim()} role="alert" aria-live="polite">
            <IconInfo />
            <span>{message.text}</span>
          </div>

          <form noValidate onSubmit={submitManualBooking}>
            <div className="main-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div className="panel-heading-icon">
                    <IconUser size={17} />
                  </div>
                  <h2>Customer &amp; Event Information</h2>
                </div>

                <p className="section-label">Customer</p>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="customerName">
                      Customer Name <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconUser className="input-icon" />
                      <input
                        type="text"
                        id="customerName"
                        placeholder="Full name"
                        required
                        value={form.customer_name}
                        onChange={(event) => updateForm("customer_name", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="customerPhone">
                      Phone Number <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconPhone className="input-icon" />
                      <input
                        type="text"
                        id="customerPhone"
                        placeholder="01XXXXXXXXX"
                        required
                        value={form.customer_phone}
                        onChange={(event) => updateForm("customer_phone", event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="customerEmail">
                      Email <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconMail className="input-icon" />
                      <input
                        type="email"
                        id="customerEmail"
                        placeholder="Customer email"
                        required
                        value={form.customer_email}
                        onChange={(event) => updateForm("customer_email", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="customerAddress">Address</label>
                    <div className="input-wrap">
                      <IconLocation className="input-icon" />
                      <input
                        type="text"
                        id="customerAddress"
                        placeholder="Customer address"
                        value={form.customer_address}
                        onChange={(event) => updateForm("customer_address", event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="customerPassword">
                    Temporary Password <span className="req">*</span>
                  </label>
                  <div className="password-row">
                    <div className="input-wrap" style={{ flex: 1 }}>
                      <IconLock className="input-icon" />
                      <input
                        type="text"
                        id="customerPassword"
                        placeholder="Generate password"
                        required
                        readOnly
                        value={form.password}
                        onChange={(event) => updateForm("password", event.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-generate"
                      title="Generate new password"
                      onClick={() => updateForm("password", generateRandomPassword())}
                    >
                      <IconRefresh />
                    </button>
                  </div>
                  <p className="muted" style={{ marginTop: "7px" }}>
                    This password will be sent to the customer email. Customer can change it later.
                  </p>
                </div>

                <p className="section-label">Event</p>

                <div className="field">
                  <label htmlFor="eventTitle">
                    Event Title <span className="req">*</span>
                  </label>
                  <div className="input-wrap">
                    <IconEdit className="input-icon" />
                    <input
                      type="text"
                      id="eventTitle"
                      placeholder="Wedding Ceremony, Conference, etc."
                      required
                      value={form.event_title}
                      onChange={(event) => updateForm("event_title", event.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="eventType">
                      Event Type <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconInfo className="input-icon" size={15} />
                      <input
                        type="text"
                        id="eventType"
                        placeholder="Wedding / Seminar / Party"
                        required
                        value={form.event_type}
                        onChange={(event) => updateForm("event_type", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="guestCount">
                      Guest Count <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconUsers className="input-icon" />
                      <input
                        type="number"
                        id="guestCount"
                        placeholder="Number of guests"
                        min="1"
                        required
                        value={form.guest_count}
                        onChange={(event) => updateForm("guest_count", event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="eventDetails">Event Details</label>
                  <textarea
                    id="eventDetails"
                    className="no-icon"
                    placeholder="Additional notes about event"
                    value={form.event_details}
                    onChange={(event) => updateForm("event_details", event.target.value)}
                  />
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div className="panel-heading-icon">
                    <IconCalendar />
                  </div>
                  <h2>Calendar Slot &amp; Payment</h2>
                </div>

                <p className="section-label">Select Slot</p>

                <div className="field">
                  <label htmlFor="hallId">
                    Hall <span className="req">*</span>
                  </label>
                  <div className="input-wrap">
                    <IconHome className="input-icon" />
                    <select
                      id="hallId"
                      required
                      value={selectedHallId}
                      onChange={(event) => {
                        setSelectedHallId(event.target.value);
                        setSelectedSlot(null);
                      }}
                    >
                      {isContextLoading ? (
                        <option value="">Loading halls…</option>
                      ) : (
                        halls.map((hall) => (
                          <option key={hall.id} value={hall.id}>
                            {hall.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="admin-calendar">
                  {selectedHallId ? (
                    <FullCalendar
                      plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      height="auto"
                      navLinks
                      selectable
                      dayMaxEvents={4}
                      headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "dayGridMonth,listYear",
                      }}
                      events={loadCalendarSlots}
                      dateClick={(info) => openSlotPopup(info.dateStr)}
                      eventClick={(info) => openSlotPopup(normalizeDate(info.event.extendedProps.slot.slot_date))}
                    />
                  ) : (
                    <p className="muted" style={{ textAlign: "center", padding: "20px" }}>
                      Loading calendar…
                    </p>
                  )}
                </div>

                <div className="calendar-legend">
                  <span className="legend-item">
                    <span className="legend-dot available" />
                    Available
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot booked" />
                    Booked
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot progress" />
                    Payment in Progress
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot blocked" />
                    Blocked
                  </span>
                </div>

                <div className={`slot-box ${selectedSlot ? "selected" : ""}`.trim()}>
                  <div className="slot-box-header">
                    <IconCalendar size={14} />
                    Selected Slot
                    {selectedSlot && (
                      <button type="button" className="slot-box-clear" onClick={clearSlot}>
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  {!selectedSlot ? (
                    <div>Click a date on the calendar to select an available slot.</div>
                  ) : (
                    <div>
                      <strong style={{ fontSize: "14px", display: "block", marginBottom: "4px" }}>
                        {normalizeDate(selectedSlot.slot_date)} · {selectedSlot.shift_name || "Shift"} (
                        {selectedSlot.start_time || ""} – {selectedSlot.end_time || ""})
                      </strong>
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Hall: {selectedSlot.hall_name || "—"} &nbsp;|&nbsp; Amount:{" "}
                        {selectedSlot.price_label || money(getSlotAmount(selectedSlot))}
                      </span>
                    </div>
                  )}
                </div>

                <p className="section-label">Payment</p>

                <div className="amount-card">
                  <div className="amount-line">
                    <span>Total Amount</span>
                    <strong>{money(totalAmount)}</strong>
                  </div>
                  <div className="amount-line">
                    <span>Paid Amount</span>
                    <strong>{money(paidAmount)}</strong>
                  </div>
                  <div className="amount-line due">
                    <span>Due Amount</span>
                    <strong>{money(dueAmount)}</strong>
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="paymentMethod">
                      Payment Method <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconCard className="input-icon" />
                      <select
                        id="paymentMethod"
                        required
                        value={form.payment_method}
                        onChange={(event) => updateForm("payment_method", event.target.value)}
                      >
                        <option value="cash">Cash</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card_pos">Card / POS</option>
                        <option value="due">Due</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="paidAmount">
                      Paid Amount <span className="req">*</span>
                    </label>
                    <div className="input-wrap">
                      <IconMoney className="input-icon" />
                      <input
                        type="number"
                        id="paidAmount"
                        min="0"
                        required
                        value={form.paid_amount}
                        onChange={(event) => updateForm("paid_amount", event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="paymentNote">Payment Note</label>
                  <div className="input-wrap">
                    <IconFile className="input-icon" />
                    <input
                      type="text"
                      id="paymentNote"
                      placeholder="Cash receipt, transaction ID, due note…"
                      value={form.payment_note}
                      onChange={(event) => updateForm("payment_note", event.target.value)}
                    />
                  </div>
                </div>

                <div className="actions">
                  <button
                    type="submit"
                    className={`btn btn-primary ${isSubmitting ? "loading" : ""}`.trim()}
                    disabled={isSubmitting}
                  >
                    <div className="btn-spinner" />
                    <IconCheck className="btn-icon" />
                    <span className="btn-label">
                      {isSubmitting ? "Creating Booking..." : "Confirm Manual Booking"}
                    </span>
                  </button>

                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    <IconRefresh size={15} />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className={`result-card ${result ? "show" : ""}`.trim()}>
            <div className="result-card-header">
              <div className="result-card-icon">
                <IconCheck size={20} />
              </div>
              <div>
                <h3>Booking Created Successfully</h3>
                <p className="muted">Login credentials have been sent to the customer's email.</p>
              </div>
            </div>

            {result && (
              <div className="result-grid">
                <div className="result-item">
                  <strong>Booking No</strong>
                  <span>{result.booking_no}</span>
                </div>
                <div className="result-item">
                  <strong>Customer</strong>
                  <span>{result.customer}</span>
                </div>
                <div className="result-item">
                  <strong>Date / Shift</strong>
                  <span>{result.date_shift}</span>
                </div>
                <div className="result-item">
                  <strong>Total Amount</strong>
                  <span>{result.total_amount}</span>
                </div>
                <div className="result-item">
                  <strong>Paid Amount</strong>
                  <span>{result.paid_amount}</span>
                </div>
                <div className="result-item">
                  <strong>Due Amount</strong>
                  <span>{result.due_amount}</span>
                </div>
              </div>
            )}

            <div className="result-actions">
              <button type="button" className="btn btn-primary" onClick={resetForm}>
                <IconPlus />
                New Booking
              </button>
            </div>
          </div>
        </div>
      </main>

      <div className={`slot-popup ${slotPopup.open ? "show" : ""}`.trim()} onClick={(event) => {
        if (event.target === event.currentTarget) closeSlotPopup();
      }}>
        <div className="slot-popup-card">
          <div className="slot-popup-header">
            <div className="slot-popup-title">
              <div className="slot-popup-icon">
                <IconCalendar size={16} />
              </div>
              <div>
                <h3>Select a Slot</h3>
                <p className="slot-popup-date">{slotPopup.date}</p>
              </div>
            </div>

            <button type="button" className="slot-popup-close" onClick={closeSlotPopup}>
              <IconClose />
            </button>
          </div>

          <div className="slot-list">
            {!slotPopup.slots.length ? (
              <p className="muted" style={{ textAlign: "center", padding: "20px" }}>
                No slots found for this date.
              </p>
            ) : (
              slotPopup.slots.map((slot) => {
                const status = String(slot.slot_status || "").toLowerCase();
                const isAvailable = status === "available";

                return (
                  <button
                    type="button"
                    key={slot.slot_id}
                    className={`slot-choice ${isAvailable ? "available" : "unavailable"}`}
                    disabled={!isAvailable}
                    onClick={() => {
                      if (isAvailable) chooseSlot(slot);
                    }}
                  >
                    <div className="slot-choice-row">
                      <div>
                        <div className="slot-choice-name">
                          {slot.shift_name || "Shift"} ({slot.start_time || ""} – {slot.end_time || ""})
                        </div>
                        <div className="slot-choice-meta">Hall: {slot.hall_name || "—"}</div>
                        <span className={`status-pill ${status || "blocked"}`}>
                          <span className="status-pill-dot" />
                          {formatStatus(status)}
                        </span>
                      </div>
                      <div className="slot-choice-amount">
                        {slot.price_label || money(getSlotAmount(slot))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}