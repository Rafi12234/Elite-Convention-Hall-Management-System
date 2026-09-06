import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import Sidebar from "../../components/Sidebar";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

const adminDashboardStyles = String.raw`
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

  ::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(184,134,11,0.3);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--gold);
  }

  body {
    font-family: 'Poppins', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    animation: bodyFade 0.5s ease both;
  }

  body.admin-layout {
    overflow-x: hidden;
  }

  @keyframes bodyFade {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  nav {
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--gold-border);
    padding: 0 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 68px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    position: sticky;
    top: 0;
    z-index: 200;
    animation: navSlide 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }

  @keyframes navSlide {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }

    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .nav-logo img {
    height: 38px;
    display: block;
    transition: transform var(--transition), filter var(--transition);
  }

  .nav-logo:hover img {
    transform: scale(1.05);
    filter: drop-shadow(0 4px 10px var(--gold-glow));
  }

  .nav-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .nav-link {
    text-decoration: none;
    color: var(--muted);
    font-weight: 600;
    font-size: 13.5px;
    padding: 9px 18px;
    border-radius: 50px;
    border: 1.5px solid transparent;
    transition: all var(--transition);
    position: relative;
    overflow: hidden;
  }

  .nav-link::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--gold-pale);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--transition);
    border-radius: 50px;
  }

  .nav-link:hover::before {
    transform: scaleX(1);
  }

  .nav-link:hover {
    color: var(--gold);
    border-color: var(--gold-border);
  }

  .nav-link.active {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    border-color: transparent;
  }

  .nav-link.active::before {
    display: none;
  }

  .btn-logout {
    display: flex;
    align-items: center;
    gap: 7px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #c0392b, var(--red));
    color: white;
    font-family: inherit;
    font-weight: 700;
    font-size: 13.5px;
    padding: 9px 18px;
    border-radius: 50px;
    transition: box-shadow var(--transition), transform var(--transition), background var(--transition);
    position: relative;
    overflow: hidden;
  }

  .btn-logout::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
    transform: skewX(-20deg) translateX(-150%);
    transition: transform 0.6s ease;
  }

  .btn-logout:hover::before {
    transform: skewX(-20deg) translateX(250%);
  }

  .btn-logout:hover {
    box-shadow: 0 6px 20px rgba(220,53,69,0.4);
    transform: translateY(-2px);
  }

  .admin-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    border-radius: 50px;
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

  .admin-pill-text {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--gold-dark);
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .container {
    width: 92%;
    max-width: 1280px;
    margin: auto;
    padding: 36px 0 60px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
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
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .page-title .muted {
    font-size: 13.5px;
    color: var(--muted);
    font-weight: 400;
  }

  .filter-box {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: 18px;
    padding: 14px 18px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    box-shadow: var(--shadow-card);
    transition: box-shadow var(--transition);
  }

  .filter-box:hover {
    box-shadow: var(--shadow-hover);
  }

  .filter-label {
    font-size: 13px;
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .filter-box input,
  .filter-box select {
    padding: 10px 14px;
    border: 1.5px solid #e0e0e0;
    border-radius: 12px;
    font-family: inherit;
    font-size: 13.5px;
    color: var(--text);
    background: var(--bg);
    outline: none;
    transition: border-color var(--transition), box-shadow var(--transition);
  }

  .filter-box input {
    width: 80px;
  }

  .filter-box input:focus,
  .filter-box select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-glow);
    background: var(--white);
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    font-family: inherit;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .filter-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .filter-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
    transform: skewX(-20deg) translateX(-150%);
    transition: transform 0.6s ease;
  }

  .filter-btn:hover::before {
    transform: skewX(-20deg) translateX(250%);
  }

  .filter-btn:hover {
    box-shadow: 0 6px 20px var(--gold-glow);
    transform: translateY(-1px);
  }

  .message-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    background: #fff8e1;
    color: #664d03;
    border: 1px solid #ffecb5;
    border-radius: 14px;
    margin-bottom: 22px;
    font-size: 13.5px;
    font-weight: 500;
    animation: slideDown 0.4s cubic-bezier(0.22,1,0.36,1) both;
    transition: all var(--transition);
  }

  .message-banner.hidden {
    display: none;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 18px;
    margin-bottom: 26px;
  }

  .stat-card {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    padding: 24px 22px;
    box-shadow: var(--shadow-card);
    position: relative;
    overflow: hidden;
    transition: transform var(--transition), box-shadow var(--transition);
    animation: cardPop 0.55s cubic-bezier(0.22,1,0.36,1) both;
    cursor: default;
  }

  .stat-card:nth-child(1) {
    animation-delay: 0.10s;
  }

  .stat-card:nth-child(2) {
    animation-delay: 0.15s;
  }

  .stat-card:nth-child(3) {
    animation-delay: 0.20s;
  }

  .stat-card:nth-child(4) {
    animation-delay: 0.25s;
  }

  .stat-card:nth-child(5) {
    animation-delay: 0.30s;
  }

  .stat-card:nth-child(6) {
    animation-delay: 0.35s;
  }

  @keyframes cardPop {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.95);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .stat-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-hover);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    background: radial-gradient(circle at top right, rgba(184,134,11,0.1) 0%, transparent 70%);
    border-radius: 0 var(--radius) 0 0;
  }

  .stat-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    transform: scaleX(0);
    transition: transform 0.4s ease;
  }

  .stat-card:hover::after {
    transform: scaleX(1);
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    box-shadow: 0 4px 12px var(--gold-glow);
  }

  .stat-icon svg {
    color: white;
  }

  .stat-label {
    color: var(--muted);
    font-size: 12.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .stat-value {
    font-size: 30px;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
    transition: color var(--transition);
  }

  .stat-card:hover .stat-value {
    color: var(--gold);
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 22px;
  }

  .panel {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow-card);
    overflow: hidden;
    transition: box-shadow var(--transition);
    animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
  }

  .panel:hover {
    box-shadow: var(--shadow-hover);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(184,134,11,0.12);
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .panel-title-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px var(--gold-glow);
  }

  .panel-title-icon svg {
    color: white;
  }

  .panel h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }

  .record-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--gold-border);
    padding: 4px 12px;
    border-radius: 50px;
  }

  .table-wrap {
    overflow-x: auto;
    border-radius: 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 280px;
  }

  .recent-table {
    min-width: 700px;
  }

  thead tr {
    background: linear-gradient(135deg, rgba(184,134,11,0.07), rgba(184,134,11,0.03));
  }

  th {
    padding: 13px 16px;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 2px solid rgba(184,134,11,0.15);
  }

  td {
    padding: 13px 16px;
    font-size: 13px;
    color: var(--text);
    border-bottom: 1px solid rgba(234,215,166,0.35);
    vertical-align: top;
    transition: background var(--transition);
  }

  tbody tr {
    transition: background var(--transition), transform var(--transition);
  }

  tbody tr:hover {
    background: rgba(184,134,11,0.04);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .td-empty {
    text-align: center;
    color: var(--muted);
    font-style: italic;
    padding: 28px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 50px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: capitalize;
  }

  .status-badge.completed {
    background: rgba(25,135,84,0.1);
    color: #198754;
  }

  .status-badge.pending {
    background: rgba(255,193,7,0.15);
    color: #856404;
  }

  .status-badge.cancelled {
    background: rgba(220,53,69,0.1);
    color: #dc3545;
  }

  .status-badge.confirmed {
    background: rgba(13,110,253,0.1);
    color: #0a58ca;
  }

  .status-badge.default {
    background: rgba(108,117,125,0.1);
    color: #495057;
  }

  .amount-cell {
    font-weight: 700;
    color: var(--gold-dark);
  }

  .customer-name {
    font-weight: 600;
    color: var(--text);
  }

  .customer-sub {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
  }

  .event-title {
    font-weight: 600;
  }

  .event-sub {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
  }

  .booking-no {
    font-family: 'Courier New', monospace;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--gold-dark);
    background: var(--gold-pale);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid var(--gold-border);
    white-space: nowrap;
  }

  .section-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--gold-border), transparent);
  }

  .skeleton {
    background: linear-gradient(90deg, #f0e9d8 25%, #f8f3ea 50%, #f0e9d8 75%);
    background-size: 200% 100%;
    animation: skeletonShimmer 1.4s ease-in-out infinite;
    border-radius: 8px;
  }

  @keyframes skeletonShimmer {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }

  @keyframes fadeDown {
    from {
      opacity: 0;
      transform: translateY(-16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 960px) {
    .breakdown-grid {
      grid-template-columns: 1fr;
    }

    .admin-pill {
      display: none;
    }
  }

  @media (max-width: 600px) {
    nav {
      padding: 0 4%;
    }

    .page-title h1 {
      font-size: 26px;
    }

    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .filter-box {
      padding: 12px;
    }

    .container {
      padding: 24px 0 40px;
    }
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

  .sidebar-admin-meta {
    min-width: 0;
  }

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

  .sidebar-link.disabled {
    opacity: 0.58;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sidebar-link small {
    margin-left: auto;
    font-size: 10px;
    font-weight: 800;
    color: var(--gold-dark);
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    border-radius: 999px;
    padding: 3px 7px;
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

  .admin-main {
    margin-left: 286px;
    min-height: 100vh;
    transition: margin-left var(--transition);
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
      transform: translateX(-105%);
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
`;

const defaultDashboardData = {
  cards: {},
  admin: {},
  filter: {},
  booking_status_breakdown: [],
  slot_status_breakdown: [],
  recent_bookings: [],
};

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

function buildAdminHeaders() {
  const token = getAdminToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
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

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString()}`;
}

function fmtDateTime(value) {
  if (!value) return "—";

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClass(status) {
  if (!status) return "default";

  const value = String(status).toLowerCase();

  if (value.includes("complet")) return "completed";
  if (value.includes("pend")) return "pending";
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("confirm")) return "confirmed";

  return "default";
}

function recordLabel(count) {
  return `${count} record${count !== 1 ? "s" : ""}`;
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconActivity({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function IconBars({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconMoney() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconUsers({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconClock({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconFile({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
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

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClass(status)}`}>{status || "—"}</span>;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [dashboard, setDashboard] = useState(defaultDashboardData);
  const [filterCount, setFilterCount] = useState("1");
  const [filterUnit, setFilterUnit] = useState("days");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");


  const cards = dashboard.cards || {};
  const bookingStatusRows = dashboard.booking_status_breakdown || [];
  const slotStatusRows = dashboard.slot_status_breakdown || [];
  const recentBookings = dashboard.recent_bookings || [];
  const filterLabel = dashboard.filter?.label || "Filtered";

  const adminName = admin?.name || dashboard.admin?.name || "Admin";
  const adminEmail = admin?.email || dashboard.admin?.email || "";
  const adminType = admin?.user_type || dashboard.admin?.user_type || "";



  const redirectToLogin = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    navigate("/admin-login");
  }, [navigate]);

  const handleError = useCallback(
    (error, fallback = "Dashboard loading failed.") => {
      if (error?.status === 401 || error?.status === 403 || String(error?.message || "").toLowerCase().includes("unauthorized")) {
        redirectToLogin();
        return;
      }

      setMessage(error.message || fallback);
    },
    [redirectToLogin]
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const count = Number(filterCount) > 0 ? Number(filterCount) : 1;
      const unit = filterUnit || "days";

      const result = await requestAdminApi(`/admin/dashboard?count=${count}&unit=${encodeURIComponent(unit)}`, {
        method: "GET",
      });

      const data = normalizeApiData(result) || defaultDashboardData;

      setDashboard({
        cards: data.cards || {},
        admin: data.admin || {},
        filter: data.filter || {},
        booking_status_breakdown: data.booking_status_breakdown || [],
        slot_status_breakdown: data.slot_status_breakdown || [],
        recent_bookings: data.recent_bookings || [],
      });

      if (data.admin) {
        setAdmin(data.admin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      }
    } catch (error) {
      handleError(error, "Dashboard loading failed.");
    } finally {
      setIsLoading(false);
    }
  }, [filterCount, filterUnit, handleError]);


  useEffect(() => {
    if (!getAdminToken()) {
      redirectToLogin();
      return;
    }

    document.body.classList.add("admin-layout");
    loadDashboard();

    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, [loadDashboard, redirectToLogin]);

  return (
    <>
      <style>{adminDashboardStyles}</style>

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
              <h1>Admin Dashboard</h1>
              <p className="muted">
                {isLoading
                  ? "Loading admin information…"
                  : `${adminName || ""}${adminEmail ? ` · ${adminEmail}` : ""}${adminType ? ` · ${adminType}` : ""}`}
              </p>
            </div>

            <div className="filter-box">
              <span className="filter-label">Show last</span>

              <input
                type="number"
                value={filterCount}
                min="1"
                onChange={(event) => setFilterCount(event.target.value)}
              />

              <select value={filterUnit} onChange={(event) => setFilterUnit(event.target.value)}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>

              <button className="filter-btn" type="button" onClick={loadDashboard} disabled={isLoading}>
                <IconFilter />
                {isLoading ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>

          <div className={`message-banner ${message ? "" : "hidden"}`.trim()}>
            <IconInfo />
            <span>{message}</span>
          </div>

          <p className="section-label">Overview</p>

          <div className="cards-grid">
            <StatCard icon={<IconCalendar />} label="Booked Today" value={isLoading ? "—" : cards.booked_today || 0} />
            <StatCard icon={<IconActivity />} label="Booked This Week" value={isLoading ? "—" : cards.booked_this_week || 0} />
            <StatCard icon={<IconBox />} label="Booked This Month" value={isLoading ? "—" : cards.booked_this_month || 0} />
            <StatCard icon={<IconBars />} label={`${filterLabel} Bookings`} value={isLoading ? "—" : cards.filtered_bookings || 0} />
            <StatCard icon={<IconMoney />} label="Filtered Revenue" value={isLoading ? "—" : money(cards.filtered_revenue)} />
            <StatCard icon={<IconUsers />} label="Total Customers" value={isLoading ? "—" : cards.total_customers || 0} />
          </div>

          <p className="section-label">Breakdown</p>

          <div className="breakdown-grid">
            <div className="panel" style={{ animationDelay: "0.2s" }}>
              <div className="panel-header">
                <div className="panel-title">
                  <div className="panel-title-icon">
                    <IconActivity size={15} />
                  </div>
                  <h2>Booking Status</h2>
                </div>
                <span className="record-count">{recordLabel(bookingStatusRows.length)}</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="2" className="td-empty">Loading…</td>
                      </tr>
                    ) : bookingStatusRows.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="td-empty">No data found</td>
                      </tr>
                    ) : (
                      bookingStatusRows.map((row, index) => (
                        <tr key={`${row.booking_status || "status"}-${index}`}>
                          <td>
                            <StatusBadge status={row.booking_status} />
                          </td>
                          <td>
                            <strong>{row.total || 0}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel" style={{ animationDelay: "0.25s" }}>
              <div className="panel-header">
                <div className="panel-title">
                  <div className="panel-title-icon">
                    <IconClock size={15} />
                  </div>
                  <h2>Slot Status</h2>
                </div>
                <span className="record-count">{recordLabel(slotStatusRows.length)}</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="2" className="td-empty">Loading…</td>
                      </tr>
                    ) : slotStatusRows.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="td-empty">No data found</td>
                      </tr>
                    ) : (
                      slotStatusRows.map((row, index) => (
                        <tr key={`${row.slot_status || "slot"}-${index}`}>
                          <td>
                            <StatusBadge status={row.slot_status} />
                          </td>
                          <td>
                            <strong>{row.total || 0}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="section-label">Recent Activity</p>

          <div className="panel" style={{ animationDelay: "0.3s" }}>
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-title-icon">
                  <IconFile size={15} />
                </div>
                <h2>Recent Confirmed Bookings</h2>
              </div>
              <span className="record-count">{recordLabel(recentBookings.length)}</span>
            </div>

            <div className="table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Booking No</th>
                    <th>Customer</th>
                    <th>Event</th>
                    <th>Date / Shift</th>
                    <th>Amount</th>
                    <th>Booked At</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="td-empty">Loading…</td>
                    </tr>
                  ) : recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="td-empty">No completed bookings found</td>
                    </tr>
                  ) : (
                    recentBookings.map((row, index) => (
                      <tr key={row.id || row.booking_no || index}>
                        <td>
                          <span className="booking-no">{row.booking_no || "—"}</span>
                        </td>
                        <td>
                          <div className="customer-name">{row.customer_name || "—"}</div>
                          <div className="customer-sub">{row.customer_email || ""}</div>
                          <div className="customer-sub">{row.customer_phone || ""}</div>
                        </td>
                        <td>
                          <div className="event-title">{row.event_title || "—"}</div>
                          <div className="event-sub">{row.event_type || ""}</div>
                          <div className="event-sub">Guests: {row.guest_count || "—"}</div>
                        </td>
                        <td>
                          <div>{row.slot_date || "—"}</div>
                          <div className="customer-sub">{row.shift_name || ""}</div>
                          <div className="customer-sub">
                            {row.start_time || ""}
                            {row.end_time ? ` – ${row.end_time}` : ""}
                          </div>
                        </td>
                        <td className="amount-cell">{money(row.total_amount)}</td>
                        <td className="customer-sub">{fmtDateTime(row.booked_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}