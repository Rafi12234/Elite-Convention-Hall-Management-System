import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import Sidebar from "../../components/Sidebar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

const adminBookingsStyles = String.raw`
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
    --shadow: 0 4px 24px rgba(0,0,0,0.07);
    --shadow-hover: 0 12px 40px rgba(184,134,11,0.18);
    --radius: 20px;
    --transition: 0.32s cubic-bezier(0.4,0,0.2,1);
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
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
    animation: bodyFade 0.45s ease both;
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

  .action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .btn-action {
    border: none;
    border-radius: 10px;
    padding: 7px 11px;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 800;
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
  }

  .btn-approve {
    background: rgba(25, 135, 84, 0.12);
    color: #166534;
    border: 1px solid rgba(25, 135, 84, 0.25);
  }

  .btn-approve:hover {
    background: #198754;
    color: white;
    transform: translateY(-2px);
  }

  .btn-reject {
    background: rgba(220, 53, 69, 0.10);
    color: #991b1b;
    border: 1px solid rgba(220, 53, 69, 0.22);
  }

  .btn-reject:hover {
    background: #dc3545;
    color: white;
    transform: translateY(-2px);
  }

  .btn-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
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

  .admin-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
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
    max-width: 160px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-logout {
    display: inline-flex;
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
    position: relative;
    overflow: hidden;
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .btn-logout::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%);
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

  .container {
    width: 92%;
    max-width: 1380px;
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
    margin-bottom: 6px;
  }

  .page-title .muted {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
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
    box-shadow: var(--shadow);
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

  .filter-box input[type="number"],
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

  .filter-box input[type="number"] {
    width: 80px;
  }

  .filter-box input:focus,
  .filter-box select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-glow);
    background: var(--white);
  }

  .filter-btn {
    display: inline-flex;
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

  .filter-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.2) 50%,transparent 70%);
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

  .filter-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .filter-btn .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: none;
  }

  .filter-btn.loading .spinner {
    display: block;
  }

  .filter-btn.loading .btn-label {
    opacity: 0.75;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: 14px;
    margin-bottom: 22px;
    font-size: 13.5px;
    font-weight: 500;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.4s cubic-bezier(0.4,0,0.2,1),
      padding 0.4s cubic-bezier(0.4,0,0.2,1),
      opacity 0.3s ease,
      margin 0.4s ease;
    white-space: pre-line;
  }

  .message-banner.visible {
    max-height: 120px;
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

  .section-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--gold-border), transparent);
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 18px;
    margin-bottom: 28px;
  }

  .stat-card {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    padding: 24px 22px;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
    transition: transform var(--transition), box-shadow var(--transition);
    animation: cardPop 0.55s cubic-bezier(0.22,1,0.36,1) both;
    cursor: default;
  }

  .stat-card:nth-child(1) { animation-delay: 0.10s; }
  .stat-card:nth-child(2) { animation-delay: 0.16s; }
  .stat-card:nth-child(3) { animation-delay: 0.22s; }
  .stat-card:nth-child(4) { animation-delay: 0.28s; }

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
    background: radial-gradient(circle at top right,rgba(184,134,11,0.1) 0%,transparent 70%);
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
    color: white;
  }

  .stat-label {
    font-size: 12px;
    color: var(--muted);
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

  .panel {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: 22px;
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: box-shadow var(--transition);
    animation: fadeUp 0.55s 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }

  .panel:hover {
    box-shadow: var(--shadow-hover);
  }

  .panel-header {
    padding: 22px 24px;
    border-bottom: 1px solid rgba(234,215,166,0.5);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    background: linear-gradient(135deg,rgba(184,134,11,0.03),transparent);
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .panel-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 10px var(--gold-glow);
    color: white;
  }

  .panel-header h2 {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
  }

  .panel-header .muted {
    font-size: 12px;
    color: var(--muted);
    margin-top: 3px;
  }

  .record-badge {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--gold-border);
    padding: 5px 14px;
    border-radius: 50px;
    white-space: nowrap;
    transition: all var(--transition);
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 260px;
    max-width: 420px;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
    transition: color var(--transition);
  }

  .search-wrap:focus-within .search-icon {
    color: var(--gold);
  }

  .search-input {
    width: 100%;
    padding: 11px 40px 11px 42px;
    border: 1.5px solid #e0e0e0;
    border-radius: 12px;
    font-family: inherit;
    font-size: 13.5px;
    color: var(--text);
    background: var(--bg);
    outline: none;
    transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
  }

  .search-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-glow);
    background: var(--white);
  }

  .search-clear {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--muted);
    display: none;
    align-items: center;
    padding: 2px;
    transition: color var(--transition);
  }

  .search-clear:hover {
    color: var(--red);
  }

  .search-clear.visible {
    display: flex;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1200px;
  }

  thead tr {
    background: linear-gradient(135deg,rgba(184,134,11,0.07),rgba(184,134,11,0.03));
  }

  th {
    padding: 14px 16px;
    font-size: 11px;
    font-weight: 700;
    color: var(--gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 2px solid rgba(184,134,11,0.15);
  }

  td {
    padding: 14px 16px;
    font-size: 13px;
    color: var(--text);
    border-bottom: 1px solid rgba(234,215,166,0.35);
    vertical-align: top;
    transition: background var(--transition);
  }

  tbody tr {
    transition: background var(--transition);
    animation: rowFade 0.4s ease both;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover td {
    background: rgba(184,134,11,0.04);
  }

  @keyframes rowFade {
    from {
      opacity: 0;
      transform: translateY(6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  tbody tr:nth-child(1) { animation-delay: 0.03s; }
  tbody tr:nth-child(2) { animation-delay: 0.06s; }
  tbody tr:nth-child(3) { animation-delay: 0.09s; }
  tbody tr:nth-child(4) { animation-delay: 0.12s; }
  tbody tr:nth-child(5) { animation-delay: 0.15s; }
  tbody tr:nth-child(6) { animation-delay: 0.18s; }
  tbody tr:nth-child(7) { animation-delay: 0.21s; }
  tbody tr:nth-child(8) { animation-delay: 0.24s; }
  tbody tr:nth-child(9) { animation-delay: 0.27s; }
  tbody tr:nth-child(10) { animation-delay: 0.30s; }

  .cell-primary {
    font-weight: 600;
    color: var(--text);
  }

  .cell-sub {
    font-size: 12px;
    color: var(--muted);
    margin-top: 3px;
    line-height: 1.55;
  }

  .cell-sub span {
    display: block;
  }

  .booking-no {
    font-family: 'Courier New', monospace;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--gold-dark);
    background: var(--gold-pale);
    padding: 3px 9px;
    border-radius: 6px;
    border: 1px solid var(--gold-border);
    white-space: nowrap;
    display: inline-block;
    margin-bottom: 5px;
  }

  .money-cell {
    font-weight: 800;
    color: var(--gold-dark);
    white-space: nowrap;
    font-size: 14px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: 50px;
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
    text-transform: capitalize;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .badge-success {
    background: #dcfce7;
    color: #166534;
  }

  .badge-success .badge-dot {
    background: #166534;
  }

  .badge-warning {
    background: #fff3cd;
    color: #664d03;
  }

  .badge-warning .badge-dot {
    background: #856404;
  }

  .badge-danger {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-danger .badge-dot {
    background: #991b1b;
  }

  .badge-muted {
    background: #f1f5f9;
    color: #475569;
  }

  .badge-muted .badge-dot {
    background: #94a3b8;
  }

  .empty-state {
    padding: 48px 24px;
    text-align: center;
    color: var(--muted);
  }

  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
    color: var(--gold);
  }

  .empty-state p {
    font-size: 14px;
    font-weight: 500;
  }

  .empty-state small {
    font-size: 12.5px;
    color: #9ca3af;
    margin-top: 4px;
    display: block;
  }

  .skeleton-row td {
    padding: 16px;
  }

  .skeleton-line {
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(90deg,#f0e9d8 25%,#f8f3ea 50%,#f0e9d8 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    margin-bottom: 6px;
  }

  .skeleton-line:last-child {
    margin-bottom: 0;
    width: 70%;
  }

  @keyframes shimmer {
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
    .admin-pill {
      display: none;
    }
  }

  @media (max-width: 768px) {
    nav {
      height: auto;
      padding: 14px 4%;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .nav-actions {
      width: 100%;
      flex-wrap: wrap;
    }

    .nav-link,
    .btn-logout {
      flex: 1;
      justify-content: center;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-box {
      width: 100%;
    }

    .filter-box input[type="number"],
    .filter-box select,
    .filter-btn {
      width: 100%;
    }

    .search-wrap {
      max-width: 100%;
      min-width: 100%;
    }

    .panel-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (max-width: 480px) {
    .stats-row {
      grid-template-columns: 1fr 1fr;
    }

    .page-title h1 {
      font-size: 26px;
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

  .btn-view {
  background: rgba(13, 110, 253, 0.10);
  color: #0d47a1;
  border: 1px solid rgba(13, 110, 253, 0.22);
}

.btn-view:hover {
  background: #0d6efd;
  color: white;
  transform: translateY(-2px);
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

function badgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (["booked", "confirmed", "paid", "completed"].includes(value)) {
    return "badge-success";
  }

  if (["pending", "payment_in_progress", "pending_approval"].includes(value)) {
    return "badge-warning";
  }

  if (["cancelled", "failed", "rejected"].includes(value)) {
    return "badge-danger";
  }

  return "badge-muted";
}

function calcSummary(rows) {
  return {
    totalBookings: rows.length,
    totalRevenue: rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    totalGuests: rows.reduce((sum, row) => sum + Number(row.guest_count || 0), 0),
    uniqueCustomers: new Set(
      rows
        .map((row) => row.user_id || row.customer_email || row.customer_phone)
        .filter(Boolean)
    ).size,
  };
}

function getFilteredBookings(rows, keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return rows;

  return rows.filter((row) => {
    return [
      row.booking_no,
      row.booking_status,
      row.booking_source,
      row.customer_name,
      row.customer_email,
      row.customer_phone,
      row.customer_address,
      row.event_title,
      row.event_type,
      row.event_details,
      row.slot_date,
      row.hall_name,
      row.shift_name,
      row.total_amount,
      row.booked_at,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedKeyword);
  });
}

function recordLabel(count) {
  return `${count} record${count !== 1 ? "s" : ""}`;
}

function canApproveReject(row) {
  const status = String(row?.booking_status || "").toLowerCase();
  const source = String(row?.booking_source || "").toLowerCase();

  return status === "pending" && source === "online";
}

function IconFile({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconMoney({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function IconUser({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconActivity({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconInfo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconSearch({ className = "", size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconClose({ size = 14 }) {
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

function IconCalendar({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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

function IconEdit({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`badge ${badgeClass(status)}`}>
      <span className="badge-dot" />
      {status || "—"}
    </span>
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

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((row) => (
        <tr className="skeleton-row" key={row}>
          {Array.from({ length: 9 }).map((_, index) => (
            <td key={index}>
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState({});
  const [filterCount, setFilterCount] = useState("1");
  const [filterUnit, setFilterUnit] = useState("days");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionBookingId, setActionBookingId] = useState(null);
  const [message, setMessage] = useState({
    text: "",
    type: "error",
    visible: false,
  });

  const filteredBookings = useMemo(() => getFilteredBookings(bookings, searchKeyword), [bookings, searchKeyword]);
  const summary = useMemo(() => calcSummary(filteredBookings), [filteredBookings]);

  const adminName = admin?.name || "Admin";
  const adminEmail = admin?.email || "—";
  const adminType = admin?.user_type || "—";

  const showMessage = useCallback((text, type = "error") => {
    setMessage({
      text,
      type,
      visible: true,
    });
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

  const loadBookings = useCallback(async () => {
    clearMessage();
    setIsLoading(true);

    try {
      const count = Number(filterCount) > 0 ? Number(filterCount) : 1;
      const unit = filterUnit || "days";

      const result = await requestAdminApi(`/admin/bookings?count=${count}&unit=${encodeURIComponent(unit)}`, {
        method: "GET",
      });

      const data = normalizeApiData(result) || {};
      const bookingRows = Array.isArray(data.bookings) ? data.bookings : [];

      setBookings(bookingRows);
      setFilter(data.filter || {});

      if (data.admin) {
        setAdmin(data.admin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      }
    } catch (error) {
      setBookings([]);
      setFilter({});
      handleAdminError(error, "Unable to load bookings.");
    } finally {
      setIsLoading(false);
    }
  }, [clearMessage, filterCount, filterUnit, handleAdminError]);

  const updateBookingApproval = useCallback(
    async (bookingId, action) => {
      clearMessage();

      const actionText = action === "approve" ? "approve" : "reject";
      const confirmText =
        action === "approve"
          ? "Are you sure you want to approve this booking?"
          : "Are you sure you want to reject this booking?";

      if (!window.confirm(confirmText)) return;

      setIsActionLoading(true);
      setActionBookingId(bookingId);

      try {
        const result = await requestAdminApi(`/admin/bookings/${bookingId}/${action}`, {
          method: "POST",
        });

        showMessage(result.message || `Booking ${actionText}d successfully.`, "success");
        await loadBookings();
      } catch (error) {
        handleAdminError(error, `Unable to ${actionText} booking.`);
      } finally {
        setIsActionLoading(false);
        setActionBookingId(null);
      }
    },
    [clearMessage, handleAdminError, loadBookings, showMessage]
  );

  useEffect(() => {
    if (!getAdminToken()) {
      redirectToLogin();
      return;
    }

    document.body.classList.add("admin-layout");

    const storedAdmin = getStoredAdmin();
    if (storedAdmin) setAdmin(storedAdmin);

    loadBookings();

    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, [loadBookings, redirectToLogin]);

  return (
    <>
      <style>{adminBookingsStyles}</style>

      <Sidebar admin={admin} />
      <main className="admin-main">

        <div className="container">
          <div className="page-header">
            <div className="page-title">
              <h1>Bookings</h1>
              <p className="muted">
                {adminName || "Admin"} · {adminEmail} · {adminType}
              </p>
              <p className="muted">
                {filter?.label
                  ? `${filter.label} · ${filter.start_date || ""} to ${filter.end_date || ""}`
                  : isLoading
                    ? "Filter loading…"
                    : "Filter information unavailable"}
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

              <button
                className={`filter-btn ${isLoading ? "loading" : ""}`.trim()}
                type="button"
                onClick={loadBookings}
                disabled={isLoading}
              >
                <div className="spinner" />
                <span className="btn-label">{isLoading ? "Loading..." : "Apply Filter"}</span>
              </button>
            </div>
          </div>

          <div className={`message-banner ${message.type} ${message.visible ? "visible" : ""}`.trim()}>
            <IconInfo />
            <span>{message.text}</span>
          </div>

          <p className="section-label">Summary</p>

          <div className="stats-row">
            <StatCard icon={<IconFile />} label="Total Bookings" value={isLoading ? "—" : summary.totalBookings} />
            <StatCard icon={<IconMoney />} label="Total Revenue" value={isLoading ? "—" : money(summary.totalRevenue)} />
            <StatCard icon={<IconUsers />} label="Total Guests" value={isLoading ? "—" : summary.totalGuests} />
            <StatCard icon={<IconUser />} label="Unique Customers" value={isLoading ? "—" : summary.uniqueCustomers} />
          </div>

          <p className="section-label">Records</p>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-icon">
                  <IconActivity />
                </div>

                <div>
                  <h2>All Booking Records</h2>
                  <p className="muted">Pending, confirmed, rejected and cancelled bookings</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span className="record-badge">{recordLabel(filteredBookings.length)}</span>

                <div className="search-wrap">
                  <IconSearch className="search-icon" />
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search booking no, name, email, event…"
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                  />

                  <button
                    className={`search-clear ${searchKeyword.trim() ? "visible" : ""}`.trim()}
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchKeyword("")}
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Booking Info</th>
                    <th>Customer Info</th>
                    <th>Address</th>
                    <th>Event Info</th>
                    <th>Slot Info</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Booked At</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <SkeletonRows />
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="9">
                        <div className="empty-state">
                          <div className="empty-icon">
                            <IconSearch size={24} />
                          </div>
                          <p>{searchKeyword ? "No results match your search." : "No bookings found for this filter."}</p>
                          <small>{searchKeyword ? "Try different keywords." : "Try adjusting the date filter above."}</small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((row, index) => {
                      const source = String(row.booking_source || "").toLowerCase();
                      const isCurrentActionLoading = isActionLoading && Number(actionBookingId) === Number(row.id);

                      return (
                        <tr key={row.id || row.booking_no || index} style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}>
                          <td>
                            <span className="booking-no">{row.booking_no || "—"}</span>
                            <div className="cell-sub">
                              <span>ID: {row.id || "—"}</span>
                              <span>Source: {row.booking_source || "—"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="cell-primary">{row.customer_name || "—"}</div>
                            <div className="cell-sub">
                              <span>✉ {row.customer_email || "—"}</span>
                              <span>📞 {row.customer_phone || "—"}</span>
                              <span>ID: {row.user_id || "—"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="cell-sub">
                              <span>{row.customer_address || "—"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="cell-primary">{row.event_title || "—"}</div>
                            <div className="cell-sub">
                              <span>Type: {row.event_type || "—"}</span>
                              <span>Guests: {row.guest_count || "—"}</span>
                              <span>Details: {row.event_details || "—"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="cell-primary">{row.slot_date || "—"}</div>
                            <div className="cell-sub">
                              <span>Hall: {row.hall_name || "—"}</span>
                              <span>Shift: {row.shift_name || "—"}</span>
                              <span>
                                {row.start_time || ""}
                                {row.end_time ? ` – ${row.end_time}` : ""}
                              </span>
                              <span>Slot: {row.slot_status || "—"}</span>
                            </div>
                          </td>

                          <td>
                            <span className="money-cell">{money(row.total_amount)}</span>
                          </td>

                          <td>
                            <StatusBadge status={row.booking_status} />
                            <div className="cell-sub" style={{ marginTop: "6px" }}>
                              <span>User: {row.user_status || "—"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="cell-sub">
                              <span>{fmtDateTime(row.booked_at || row.created_at)}</span>
                            </div>
                          </td>

                          <td>
  <div className="action-buttons">
    <button
      className="btn-action btn-view"
      type="button"
      onClick={() => navigate(`/admin-booking-details/${row.id}`)}
    >
      👁 View
    </button>

    {canApproveReject(row) ? (
      <>
        <button
          className="btn-action btn-approve"
          type="button"
          disabled={isActionLoading}
          onClick={() => updateBookingApproval(row.id, "approve")}
        >
          {isCurrentActionLoading ? "Working..." : "Approve"}
        </button>

        <button
          className="btn-action btn-reject"
          type="button"
          disabled={isActionLoading}
          onClick={() => updateBookingApproval(row.id, "reject")}
        >
          {isCurrentActionLoading ? "Working..." : "Reject"}
        </button>
      </>
    ) : source === "offline" ? (
      <span className="cell-sub">Office booking</span>
    ) : (
      <span className="cell-sub">No action</span>
    )}
  </div>
</td>
                        </tr>
                      );
                    })
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