import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest } from "../../services/api";
import Sidebar from "../../components/Sidebar";

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

const adminReportsStyles = String.raw`
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
    --radius: 20px;
    --transition: 0.28s cubic-bezier(0.4,0,0.2,1);
  }

  body {
    font-family: 'Poppins', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  body.admin-layout {
    overflow-x: hidden;
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

  .muted {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
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
  }

  .message-banner.error {
    background: rgba(220,53,69,0.08);
    border: 1px solid rgba(220,53,69,0.22);
    color: var(--red);
  }

  .tabs {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: 18px;
    padding: 8px;
    display: flex;
    gap: 8px;
    box-shadow: var(--shadow);
    margin-bottom: 24px;
    overflow-x: auto;
  }

  .tab-btn {
    border: none;
    border-radius: 14px;
    padding: 12px 18px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    background: transparent;
    color: var(--muted);
    white-space: nowrap;
    transition: all var(--transition);
  }

  .tab-btn.active {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    box-shadow: 0 8px 20px var(--gold-glow);
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

  .filter-panel,
  .panel,
  .stat-card {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .filter-panel {
    padding: 20px;
    margin-bottom: 24px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    gap: 16px;
    align-items: end;
  }

  .form-group {
    display: grid;
    gap: 7px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 800;
    color: var(--gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .form-control {
    width: 100%;
    border: 1.5px solid #e0e0e0;
    background: var(--bg);
    border-radius: 14px;
    padding: 12px 14px;
    font-family: inherit;
    color: var(--text);
    outline: none;
    min-height: 46px;
  }

  .form-control:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-glow);
    background: white;
  }

  .report-action-row {
    grid-column: 1 / -1;
    margin-top: 10px;
    padding-top: 18px;
    border-top: 1px solid #f0e4ca;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .report-action-text {
    min-width: 230px;
  }

  .report-action-text strong {
    display: block;
    font-size: 13px;
    color: var(--gold-dark);
    margin-bottom: 4px;
  }

  .report-action-text span {
    font-size: 12px;
    color: var(--muted);
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .primary-btn,
  .secondary-btn,
  .export-btn,
  .pdf-btn,
  .print-btn {
    border: none;
    border-radius: 13px;
    padding: 11px 17px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    min-height: 42px;
  }

  .primary-btn {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
  }

  .secondary-btn {
    background: #fffaf0;
    color: var(--gold-dark);
    border: 1px solid var(--gold-border);
  }

  .export-btn {
    background: rgba(25,135,84,0.1);
    color: var(--green);
    border: 1px solid rgba(25,135,84,0.25);
  }

  .pdf-btn {
    background: rgba(220,53,69,0.09);
    color: var(--red);
    border: 1px solid rgba(220,53,69,0.22);
  }

  .print-btn {
    background: rgba(107,114,128,0.10);
    color: var(--text);
    border: 1px solid rgba(107,114,128,0.22);
  }

  .primary-btn:hover,
  .secondary-btn:hover,
  .export-btn:hover,
  .pdf-btn:hover,
  .print-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px var(--gold-glow);
  }

  .primary-btn:disabled,
  .secondary-btn:disabled,
  .export-btn:disabled,
  .pdf-btn:disabled,
  .print-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 18px;
    margin-bottom: 28px;
  }

  .stat-card {
    padding: 24px 22px;
    overflow: hidden;
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--gold-pale);
    color: var(--gold-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }

  .stat-label {
    font-size: 13px;
    color: var(--muted);
    font-weight: 600;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 27px;
    font-weight: 800;
    color: var(--text);
  }

  .panel {
    overflow: hidden;
    margin-bottom: 28px;
  }

  .panel-header {
    padding: 20px 22px;
    border-bottom: 1px solid var(--gold-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .panel-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .panel-title h2 {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 3px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1100px;
  }

  thead {
    background: #fffaf0;
  }

  th {
    padding: 15px 18px;
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    color: var(--gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    border-bottom: 1px solid var(--gold-border);
  }

  td {
    padding: 18px;
    border-bottom: 1px solid #f1eadc;
    vertical-align: top;
    font-size: 13.5px;
  }

  tbody tr:hover {
    background: rgba(184,134,11,0.035);
  }

  .cell-primary {
    font-weight: 800;
    color: var(--text);
    margin-bottom: 5px;
  }

  .cell-sub {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .money-cell {
    color: var(--gold-dark);
    font-weight: 900;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    text-transform: capitalize;
  }

  .badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .badge-success {
    background: rgba(25,135,84,0.10);
    color: var(--green);
  }

  .badge-warning {
    background: rgba(255,193,7,0.16);
    color: #9a6a00;
  }

  .badge-danger {
    background: rgba(220,53,69,0.10);
    color: var(--red);
  }

  .badge-muted {
    background: rgba(107,114,128,0.12);
    color: var(--muted);
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
  }

  .empty-state {
    padding: 42px 18px;
    text-align: center;
    color: var(--muted);
  }

  a {
    color: var(--gold-dark);
    font-weight: 800;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  @media (max-width: 1100px) {
    .filter-grid {
      grid-template-columns: repeat(2, minmax(160px, 1fr));
    }
  }

  @media (max-width: 900px) {
    .container {
      width: 94%;
      padding-top: 24px;
    }

    .page-title h1 {
      font-size: 27px;
    }

    .two-col {
      grid-template-columns: 1fr;
    }

    .report-action-row {
      align-items: flex-start;
    }

    .action-buttons {
      justify-content: flex-start;
    }
  }

  @media (max-width: 640px) {
    .filter-grid {
      grid-template-columns: 1fr;
    }

    .primary-btn,
    .secondary-btn,
    .export-btn,
    .pdf-btn,
    .print-btn {
      width: 100%;
    }

    .action-buttons {
      width: 100%;
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

  return apiRequest(endpoint, {
    ...options,
    headers: {
      ...buildAdminHeaders(),
      ...(options.headers || {}),
    },
  });
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDate() {
  return localDateInputValue(new Date());
}

function monthStartDate() {
  const date = new Date();
  date.setDate(1);

  return localDateInputValue(date);
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString()}`;
}

function fmtDate(value) {
  if (!value) return "—";

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function makeSafeFileName(name) {
  return String(name || "report")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function exportExcelReport(fileName, sections) {
  const workbook = XLSX.utils.book_new();

  const makeRowsForFullReport = () => {
    const fullRows = [];

    sections.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) {
        fullRows.push({});
        fullRows.push({});
      }

      fullRows.push({
        A: section.title,
      });

      const rows =
        Array.isArray(section.rows) && section.rows.length > 0
          ? section.rows
          : [{ Message: "No data available" }];

      const columns =
        section.columns && section.columns.length > 0
          ? section.columns
          : Object.keys(rows[0] || { Message: "No data available" });

      const headerRow = {};
      columns.forEach((column, index) => {
        headerRow[String.fromCharCode(65 + index)] = column;
      });
      fullRows.push(headerRow);

      rows.forEach((row) => {
        const dataRow = {};
        columns.forEach((column, index) => {
          dataRow[String.fromCharCode(65 + index)] = row[column] ?? "—";
        });
        fullRows.push(dataRow);
      });
    });

    return fullRows;
  };

  const fullReportRows = makeRowsForFullReport();

  const fullReportWorksheet = XLSX.utils.json_to_sheet(fullReportRows, {
    skipHeader: true,
  });

  const maxColumnCount = sections.reduce((max, section) => {
    const rows =
      Array.isArray(section.rows) && section.rows.length > 0
        ? section.rows
        : [{ Message: "No data available" }];

    const columns =
      section.columns && section.columns.length > 0
        ? section.columns
        : Object.keys(rows[0] || { Message: "No data available" });

    return Math.max(max, columns.length);
  }, 1);

  fullReportWorksheet["!cols"] = Array.from({ length: maxColumnCount }).map((_, columnIndex) => {
    let maxLength = 14;
    const columnLetter = String.fromCharCode(65 + columnIndex);

    fullReportRows.forEach((row) => {
      const value = row[columnLetter];
      if (value !== undefined && value !== null) {
        maxLength = Math.max(maxLength, String(value).length + 3);
      }
    });

    return {
      wch: Math.min(Math.max(maxLength, 14), 38),
    };
  });

  XLSX.utils.book_append_sheet(workbook, fullReportWorksheet, "Full Report");

  sections.forEach((section) => {
    const rows =
      Array.isArray(section.rows) && section.rows.length > 0
        ? section.rows
        : [{ Message: "No data available" }];

    const columns =
      section.columns && section.columns.length > 0
        ? section.columns
        : Object.keys(rows[0] || { Message: "No data available" });

    const orderedRows = rows.map((row) => {
      const orderedRow = {};

      columns.forEach((column) => {
        orderedRow[column] = row[column] ?? "—";
      });

      return orderedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(orderedRows, {
      header: columns,
    });

    worksheet["!cols"] = columns.map((column) => {
      const maxLength = Math.max(
        String(column).length,
        ...orderedRows.map((row) => String(row[column] ?? "").length)
      );

      return {
        wch: Math.min(Math.max(maxLength + 3, 14), 38),
      };
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, section.name.slice(0, 31));
  });

  workbook.Workbook = {
    Views: [
      {
        activeTab: 0,
      },
    ],
  };

  XLSX.writeFile(workbook, `${makeSafeFileName(fileName)}.xlsx`);
}

function exportPdfReport(title, fileName, filters, sections) {
  const doc = new jsPDF("landscape", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text(title, 40, 38);

  doc.setFontSize(9);
  doc.text(`Generated: ${generatedAt}`, 40, 56);

  if (filters?.from || filters?.to) {
    doc.text(`Date Range: ${filters.from || "All"} to ${filters.to || "All"}`, 40, 72);
  }

  let startY = 96;

  sections.forEach((section, index) => {
    if (startY > 500) {
      doc.addPage();
      startY = 40;
    }

    doc.setFontSize(12);
    doc.text(section.title, 40, startY);

    const rows =
      Array.isArray(section.rows) && section.rows.length > 0
        ? section.rows
        : [{ Message: "No data available" }];

    const columns = section.columns || Object.keys(rows[0] || { Message: "No data available" });

    autoTable(doc, {
      startY: startY + 10,
      head: [columns],
      body: rows.map((row) => columns.map((column) => row[column] ?? "—")),
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 4,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [184, 134, 11],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [250, 247, 242],
      },
      margin: {
        left: 40,
        right: 40,
      },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.text(
          `Elite Convention Hall - ${title}`,
          pageWidth - 40,
          doc.internal.pageSize.getHeight() - 18,
          { align: "right" }
        );
      },
    });

    startY = doc.lastAutoTable.finalY + 28;

    if (index < sections.length - 1 && startY > 500) {
      doc.addPage();
      startY = 40;
    }
  });

  doc.save(`${makeSafeFileName(fileName)}.pdf`);
}

function printReport(title, filters, sections) {
  const generatedAt = new Date().toLocaleString();

  const sectionHtml = sections
    .map((section) => {
      const rows =
        Array.isArray(section.rows) && section.rows.length > 0
          ? section.rows
          : [{ Message: "No data available" }];

      const columns = section.columns || Object.keys(rows[0] || { Message: "No data available" });
      const headerHtml = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");

      const bodyHtml = rows
        .map((row) => {
          const cells = columns
            .map((column) => `<td>${escapeHtml(row[column] ?? "—")}</td>`)
            .join("");

          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `
        <section>
          <h2>${escapeHtml(section.title)}</h2>
          <table>
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const popup = window.open("", "_blank", "width=1200,height=800");

  if (!popup) {
    alert("Popup blocked. Please allow popups to print this report.");
    return;
  }

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
          h1 { margin: 0 0 6px; color: #8f6908; }
          .meta { margin: 0 0 20px; font-size: 12px; color: #555; }
          h2 { margin: 24px 0 10px; font-size: 16px; color: #8f6908; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 11px; }
          th { background: #b8860b; color: white; text-align: left; }
          th, td { border: 1px solid #ddd; padding: 7px; vertical-align: top; }
          tr:nth-child(even) { background: #faf7f2; }
          @media print {
            body { padding: 12px; }
            button { display: none; }
            section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="margin-bottom: 16px; padding: 10px 14px; cursor: pointer;">
          Print Report
        </button>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">
          Generated: ${escapeHtml(generatedAt)}
          ${
            filters?.from || filters?.to
              ? ` | Date Range: ${escapeHtml(filters.from || "All")} to ${escapeHtml(filters.to || "All")}`
              : ""
          }
        </p>
        ${sectionHtml}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
}

function badgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (["active", "confirmed", "success", "paid", "booked"].includes(value)) return "badge-success";
  if (["pending", "inactive", "partial", "payment_in_progress", "pending_approval"].includes(value)) return "badge-warning";
  if (["blocked", "cancelled", "failed", "rejected"].includes(value)) return "badge-danger";

  return "badge-muted";
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

function IconReport({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-7" />
    </svg>
  );
}

function IconMoney({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconUsers({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconInfo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ReportActions({
  title,
  isLoading,
  onApply,
  onReset,
  onExcel,
  onPdf,
  onPrint,
}) {
  return (
    <div className="report-action-row">
      <div className="report-action-text">
        <strong>{title}</strong>
        <span>Export includes full records from the selected filters and date range.</span>
      </div>

      <div className="action-buttons">
        <button className="primary-btn" type="submit" disabled={isLoading} onClick={onApply}>
          {isLoading ? "Loading..." : "Apply Filter"}
        </button>

        <button className="secondary-btn" type="button" onClick={onReset} disabled={isLoading}>
          Reset
        </button>

        <button className="export-btn" type="button" onClick={onExcel} disabled={isLoading}>
          Export Excel
        </button>

        <button className="pdf-btn" type="button" onClick={onPdf} disabled={isLoading}>
          Export PDF
        </button>

        <button className="print-btn" type="button" onClick={onPrint} disabled={isLoading}>
          Print
        </button>
      </div>
    </div>
  );
}

function getBookingReportExportSections(report) {
  const summary = report.summary || {};
  const bookings = Array.isArray(report.bookings) ? report.bookings : [];

  const bookingRows = bookings.map((booking) => ({
    "Booking ID": booking.id || "—",
    "Booking No": booking.booking_no || `#${booking.id}`,
    "Customer Name": booking.customer_name || "—",
    "Customer Phone": booking.customer_phone || "—",
    "Customer Email": booking.customer_email || "—",
    "Event Title": booking.event_title || "—",
    "Event Type": booking.event_type || "—",
    "Event Details": booking.event_details || "—",
    "Hall": booking.hall_name || "—",
    "Shift": booking.shift_name || "—",
    "Start Time": booking.start_time || "—",
    "End Time": booking.end_time || "—",
    "Slot Date": booking.slot_date || "—",
    "Guest Count": booking.guest_count || 0,
    "Total Amount": Number(booking.total_amount || 0),
    "Booking Status": booking.booking_status || "—",
    "Booking Source": booking.booking_source || "—",
    "Booked At": fmtDate(booking.booked_at),
    "Created At": fmtDate(booking.created_at),
  }));

  const summaryRows = [
    { Metric: "Total Bookings", Value: summary.total_bookings ?? 0 },
    {
      Metric: "Approved / Confirmed Bookings",
      Value: summary.approved_bookings ?? summary.confirmed_bookings ?? 0,
    },
    { Metric: "Pending Bookings", Value: summary.pending_bookings ?? 0 },
    { Metric: "Rejected Bookings", Value: summary.rejected_bookings ?? 0 },
    { Metric: "Cancelled Bookings", Value: summary.cancelled_bookings ?? 0 },
  ];

  return [
    {
      title: "All Booking Records",
      name: "Booking Records",
      columns: [
        "Booking ID",
        "Booking No",
        "Customer Name",
        "Customer Phone",
        "Customer Email",
        "Event Title",
        "Event Type",
        "Event Details",
        "Hall",
        "Shift",
        "Start Time",
        "End Time",
        "Slot Date",
        "Guest Count",
        "Total Amount",
        "Booking Status",
        "Booking Source",
        "Booked At",
        "Created At",
      ],
      rows: bookingRows,
    },
    {
      title: "Booking Summary",
      name: "Summary",
      columns: ["Metric", "Value"],
      rows: summaryRows,
    },
  ];
}

function getRevenueReportExportSections(report) {
  const summary = report.summary || {};
  const revenueByPeriod = Array.isArray(report.revenue_by_period)
    ? report.revenue_by_period
    : [];
  const revenueByMethod = Array.isArray(report.revenue_by_method)
    ? report.revenue_by_method
    : [];
  const payments = Array.isArray(report.payments) ? report.payments : [];

  const paymentRows = payments.map((payment) => ({
    "Payment ID": payment.id || "—",
    "Booking ID": payment.booking_id || "—",
    "Booking No": payment.booking_no || `#${payment.booking_id}`,
    "Customer Name": payment.customer_name || "—",
    "Customer Phone": payment.customer_phone || "—",
    "Event Title": payment.event_title || "—",
    "Booking Total": Number(payment.booking_total || 0),
    "Paid Amount": Number(payment.amount || 0),
    "Payment Method": payment.payment_method || "—",
    "Payment Status": payment.payment_status || "—",
    "Card Last Four": payment.card_last_four
      ? `**** ${payment.card_last_four}`
      : "—",
    "Paid At": fmtDate(payment.paid_at),
    "Created At": fmtDate(payment.created_at),
  }));

  const periodRows = revenueByPeriod.map((row) => ({
    "Period": row.period_label || "—",
    "Payment Count": row.payment_count || 0,
    "Total Amount": Number(row.total_amount || 0),
  }));

  const methodRows = revenueByMethod.map((row) => ({
    "Payment Method": row.payment_method || "Unknown",
    "Payment Count": row.payment_count || 0,
    "Total Amount": Number(row.total_amount || 0),
  }));

  const summaryRows = [
    { Metric: "Total Paid Amount", Value: money(summary.total_paid_amount) },
    { Metric: "Due Amount", Value: money(summary.due_amount) },
    { Metric: "Booking Total Amount", Value: money(summary.booking_total_amount) },
    { Metric: "Payment Count", Value: summary.payment_count ?? 0 },
  ];

  return [
    {
      title: "All Payment / Revenue Records",
      name: "Payment Records",
      columns: [
        "Payment ID",
        "Booking ID",
        "Booking No",
        "Customer Name",
        "Customer Phone",
        "Event Title",
        "Booking Total",
        "Paid Amount",
        "Payment Method",
        "Payment Status",
        "Card Last Four",
        "Paid At",
        "Created At",
      ],
      rows: paymentRows,
    },
    {
      title: "Revenue By Period",
      name: "By Period",
      columns: ["Period", "Payment Count", "Total Amount"],
      rows: periodRows,
    },
    {
      title: "Revenue By Payment Method",
      name: "By Method",
      columns: ["Payment Method", "Payment Count", "Total Amount"],
      rows: methodRows,
    },
    {
      title: "Revenue Summary",
      name: "Summary",
      columns: ["Metric", "Value"],
      rows: summaryRows,
    },
  ];
}

function getCustomerReportExportSections(report) {
  const summary = report.summary || {};
  const topCustomers = Array.isArray(report.top_customers)
    ? report.top_customers
    : [];
  const newCustomers = Array.isArray(report.new_customers)
    ? report.new_customers
    : [];
  const customers = Array.isArray(report.customers) ? report.customers : [];

  const customerColumns = [
    "Customer ID",
    "Customer Code",
    "Name",
    "Email",
    "Phone",
    "Status",
    "Address",
    "Total Bookings",
    "Confirmed",
    "Pending",
    "Rejected",
    "Booking Amount",
    "Joined At",
  ];

  const mapCustomer = (customer) => ({
    "Customer ID": customer.id || "—",
    "Customer Code": customer.customer_code || `CUST-${customer.id}`,
    "Name": customer.name || "—",
    "Email": customer.email || "—",
    "Phone": customer.phone || "—",
    "Status": customer.status || "—",
    "Address": customer.address || "—",
    "Total Bookings": customer.total_bookings || 0,
    "Confirmed": customer.confirmed_bookings || 0,
    "Pending": customer.pending_bookings || 0,
    "Rejected": customer.rejected_bookings || 0,
    "Booking Amount": Number(customer.total_booking_amount || 0),
    "Joined At": fmtDate(customer.created_at),
  });

  const customerRows = customers.map(mapCustomer);
  const topCustomerRows = topCustomers.map(mapCustomer);
  const newCustomerRows = newCustomers.map(mapCustomer);

  const summaryRows = [
    { Metric: "Total Customers", Value: summary.total_customers ?? 0 },
    { Metric: "New Customers", Value: summary.new_customers ?? 0 },
    { Metric: "Matched Customers", Value: summary.matched_customers ?? 0 },
    { Metric: "Top Customers Shown", Value: topCustomers.length },
  ];

  return [
    {
      title: "All Customer Booking Summary Records",
      name: "Customer Records",
      columns: customerColumns,
      rows: customerRows,
    },
    {
      title: "Highest Booking Customers",
      name: "Top Customers",
      columns: customerColumns,
      rows: topCustomerRows,
    },
    {
      title: "New Customers In Selected Date Range",
      name: "New Customers",
      columns: customerColumns,
      rows: newCustomerRows,
    },
    {
      title: "Customer Summary",
      name: "Summary",
      columns: ["Metric", "Value"],
      rows: summaryRows,
    },
  ];
}

function BookingReport({
  filters,
  setFilters,
  data,
  isLoading,
  onSubmit,
  onReset,
  onExportExcel,
  onExportPdf,
  onPrint,
}) {
  const summary = data.summary || {};
  const bookings = Array.isArray(data.bookings) ? data.bookings : [];

  return (
    <>
      <form className="filter-panel" onSubmit={onSubmit}>
        <div className="filter-grid">
          <div className="form-group">
            <label>From Date</label>
            <input
              className="form-control"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input
              className="form-control"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Approved / Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <ReportActions
            title="Booking Report Actions"
            isLoading={isLoading}
            onReset={onReset}
            onExcel={onExportExcel}
            onPdf={onExportPdf}
            onPrint={onPrint}
          />
        </div>
      </form>

      <p className="section-label">Booking Summary</p>

      <div className="stats-row">
        <StatCard icon={<IconReport />} label="Total Bookings" value={summary.total_bookings ?? 0} />
        <StatCard icon={<IconInfo />} label="Approved Bookings" value={summary.approved_bookings ?? 0} />
        <StatCard icon={<IconInfo />} label="Pending Bookings" value={summary.pending_bookings ?? 0} />
        <StatCard icon={<IconInfo />} label="Rejected Bookings" value={summary.rejected_bookings ?? 0} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <div className="panel-icon"><IconReport /></div>
            <div>
              <h2>Booking Report</h2>
              <p className="muted">Showing {bookings.length} booking records from selected range.</p>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Event</th>
                <th>Slot</th>
                <th>Guests</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && bookings.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state">Loading booking report...</div></td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state">No bookings found for this filter.</div></td></tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <div className="cell-primary">
                        <Link to={`/admin-booking-details/${booking.id}`}>{booking.booking_no || `#${booking.id}`}</Link>
                      </div>
                      <div className="cell-sub"><span>Source: {booking.booking_source || "—"}</span></div>
                    </td>
                    <td>
                      <div className="cell-primary">{booking.customer_name || "—"}</div>
                      <div className="cell-sub">
                        <span>{booking.customer_phone || "—"}</span>
                        <span>{booking.customer_email || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-primary">{booking.event_title || "—"}</div>
                      <div className="cell-sub">
                        <span>{booking.event_type || "—"}</span>
                        <span>{booking.event_details || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-primary">{booking.slot_date || "—"}</div>
                      <div className="cell-sub">
                        <span>{booking.hall_name || "—"}</span>
                        <span>{booking.shift_name || "—"} {booking.start_time ? `(${booking.start_time} - ${booking.end_time || ""})` : ""}</span>
                      </div>
                    </td>
                    <td>{booking.guest_count || 0}</td>
                    <td><span className="money-cell">{money(booking.total_amount)}</span></td>
                    <td><StatusBadge status={booking.booking_status} /></td>
                    <td>{fmtDate(booking.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RevenueReport({
  filters,
  setFilters,
  data,
  isLoading,
  onSubmit,
  onReset,
  onExportExcel,
  onExportPdf,
  onPrint,
}) {
  const summary = data.summary || {};
  const paymentMethods = Array.isArray(data.payment_methods) ? data.payment_methods : [];
  const revenueByPeriod = Array.isArray(data.revenue_by_period) ? data.revenue_by_period : [];
  const revenueByMethod = Array.isArray(data.revenue_by_method) ? data.revenue_by_method : [];
  const payments = Array.isArray(data.payments) ? data.payments : [];

  return (
    <>
      <form className="filter-panel" onSubmit={onSubmit}>
        <div className="filter-grid">
          <div className="form-group">
            <label>From Date</label>
            <input className="form-control" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input className="form-control" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </div>

          <div className="form-group">
            <label>Group By</label>
            <select className="form-control" value={filters.group_by} onChange={(event) => setFilters((current) => ({ ...current, group_by: event.target.value }))}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <select className="form-control" value={filters.payment_method} onChange={(event) => setFilters((current) => ({ ...current, payment_method: event.target.value }))}>
              <option value="all">All Methods</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <ReportActions
            title="Revenue Report Actions"
            isLoading={isLoading}
            onReset={onReset}
            onExcel={onExportExcel}
            onPdf={onExportPdf}
            onPrint={onPrint}
          />
        </div>
      </form>

      <p className="section-label">Revenue Summary</p>

      <div className="stats-row">
        <StatCard icon={<IconMoney />} label="Total Paid Amount" value={money(summary.total_paid_amount)} />
        <StatCard icon={<IconMoney />} label="Due Amount" value={money(summary.due_amount)} />
        <StatCard icon={<IconReport />} label="Booking Total Amount" value={money(summary.booking_total_amount)} />
        <StatCard icon={<IconInfo />} label="Payment Count" value={summary.payment_count ?? 0} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-icon"><IconReport /></div>
              <div>
                <h2>Revenue by {filters.group_by}</h2>
                <p className="muted">Grouped revenue summary.</p>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: "500px" }}>
              <thead><tr><th>Period</th><th>Payments</th><th>Total</th></tr></thead>
              <tbody>
                {revenueByPeriod.length === 0 ? (
                  <tr><td colSpan="3"><div className="empty-state">No revenue data.</div></td></tr>
                ) : revenueByPeriod.map((row) => (
                  <tr key={row.period_label}>
                    <td>{row.period_label}</td>
                    <td>{row.payment_count}</td>
                    <td><span className="money-cell">{money(row.total_amount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-icon"><IconMoney /></div>
              <div>
                <h2>Revenue by Method</h2>
                <p className="muted">Payment method breakdown.</p>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: "500px" }}>
              <thead><tr><th>Method</th><th>Payments</th><th>Total</th></tr></thead>
              <tbody>
                {revenueByMethod.length === 0 ? (
                  <tr><td colSpan="3"><div className="empty-state">No method data.</div></td></tr>
                ) : revenueByMethod.map((row) => (
                  <tr key={row.payment_method || "unknown"}>
                    <td>{row.payment_method || "Unknown"}</td>
                    <td>{row.payment_count}</td>
                    <td><span className="money-cell">{money(row.total_amount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <div className="panel-icon"><IconMoney /></div>
            <div>
              <h2>Payment Records</h2>
              <p className="muted">Showing {payments.length} payment records from selected range.</p>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Event</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Card</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && payments.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state">Loading revenue report...</div></td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state">No payment records found.</div></td></tr>
              ) : payments.map((payment) => (
                <tr key={payment.id}>
                  <td><Link to={`/admin-booking-details/${payment.booking_id}`}>{payment.booking_no || `#${payment.booking_id}`}</Link></td>
                  <td>
                    <div className="cell-primary">{payment.customer_name || "—"}</div>
                    <div className="cell-sub"><span>{payment.customer_phone || "—"}</span></div>
                  </td>
                  <td>{payment.event_title || "—"}</td>
                  <td><span className="money-cell">{money(payment.amount)}</span></td>
                  <td>{payment.payment_method || "—"}</td>
                  <td><StatusBadge status={payment.payment_status} /></td>
                  <td>{payment.card_last_four ? `**** ${payment.card_last_four}` : "—"}</td>
                  <td>{fmtDate(payment.paid_at || payment.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CustomerReport({
  filters,
  setFilters,
  data,
  isLoading,
  onSubmit,
  onReset,
  onExportExcel,
  onExportPdf,
  onPrint,
}) {
  const summary = data.summary || {};
  const topCustomers = Array.isArray(data.top_customers) ? data.top_customers : [];
  const newCustomers = Array.isArray(data.new_customers) ? data.new_customers : [];
  const customers = Array.isArray(data.customers) ? data.customers : [];

  return (
    <>
      <form className="filter-panel" onSubmit={onSubmit}>
        <div className="filter-grid">
          <div className="form-group">
            <label>From Date</label>
            <input className="form-control" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input className="form-control" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </div>

          <div className="form-group">
            <label>Search Customer</label>
            <input className="form-control" type="text" placeholder="Name, phone, email, code" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </div>

          <ReportActions
            title="Customer Report Actions"
            isLoading={isLoading}
            onReset={onReset}
            onExcel={onExportExcel}
            onPdf={onExportPdf}
            onPrint={onPrint}
          />
        </div>
      </form>

      <p className="section-label">Customer Summary</p>

      <div className="stats-row">
        <StatCard icon={<IconUsers />} label="Total Customers" value={summary.total_customers ?? 0} />
        <StatCard icon={<IconUsers />} label="New Customers" value={summary.new_customers ?? 0} />
        <StatCard icon={<IconReport />} label="Matched Customers" value={summary.matched_customers ?? 0} />
        <StatCard icon={<IconInfo />} label="Top Customers Shown" value={topCustomers.length} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-icon"><IconUsers /></div>
              <div>
                <h2>Highest Booking Customers</h2>
                <p className="muted">Top customers by booking count.</p>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: "650px" }}>
              <thead><tr><th>Customer</th><th>Phone</th><th>Bookings</th><th>Amount</th></tr></thead>
              <tbody>
                {topCustomers.length === 0 ? (
                  <tr><td colSpan="4"><div className="empty-state">No top customers found.</div></td></tr>
                ) : topCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link to={`/admin-customers/${customer.id}`}>{customer.name || "—"}</Link>
                      <div className="cell-sub"><span>{customer.email || "—"}</span></div>
                    </td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.total_bookings || 0}</td>
                    <td><span className="money-cell">{money(customer.total_booking_amount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-icon"><IconUsers /></div>
              <div>
                <h2>New Customers</h2>
                <p className="muted">Customers registered in selected range.</p>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: "650px" }}>
              <thead><tr><th>Customer</th><th>Contact</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {newCustomers.length === 0 ? (
                  <tr><td colSpan="4"><div className="empty-state">No new customers found.</div></td></tr>
                ) : newCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link to={`/admin-customers/${customer.id}`}>{customer.name || "—"}</Link>
                      <div className="cell-sub"><span>{customer.customer_code || `CUST-${customer.id}`}</span></div>
                    </td>
                    <td>
                      <div className="cell-sub">
                        <span>{customer.phone || "—"}</span>
                        <span>{customer.email || "—"}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td>{fmtDate(customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <div className="panel-icon"><IconReport /></div>
            <div>
              <h2>Customer Booking History Summary</h2>
              <p className="muted">Showing {customers.length} customer records.</p>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Total Bookings</th>
                <th>Confirmed</th>
                <th>Pending</th>
                <th>Rejected</th>
                <th>Booking Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && customers.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state">Loading customer report...</div></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state">No customers found.</div></td></tr>
              ) : customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link to={`/admin-customers/${customer.id}`}>{customer.name || "—"}</Link>
                    <div className="cell-sub"><span>{customer.customer_code || `CUST-${customer.id}`}</span></div>
                  </td>
                  <td>
                    <div className="cell-sub">
                      <span>{customer.phone || "—"}</span>
                      <span>{customer.email || "—"}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={customer.status} /></td>
                  <td>{customer.total_bookings || 0}</td>
                  <td>{customer.confirmed_bookings || 0}</td>
                  <td>{customer.pending_bookings || 0}</td>
                  <td>{customer.rejected_bookings || 0}</td>
                  <td><span className="money-cell">{money(customer.total_booking_amount)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function AdminReportsPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [activeTab, setActiveTab] = useState("bookings");
  const [loadingType, setLoadingType] = useState("");
  const [message, setMessage] = useState({ text: "", type: "error" });

  const [bookingFilters, setBookingFilters] = useState({
    from: monthStartDate(),
    to: todayDate(),
    status: "all",
  });

  const [revenueFilters, setRevenueFilters] = useState({
    from: monthStartDate(),
    to: todayDate(),
    group_by: "month",
    payment_method: "all",
  });

  const [customerFilters, setCustomerFilters] = useState({
    from: monthStartDate(),
    to: todayDate(),
    search: "",
  });

  const [bookingReport, setBookingReport] = useState({});
  const [revenueReport, setRevenueReport] = useState({});
  const [customerReport, setCustomerReport] = useState({});

  const adminName = admin?.name || "Admin";
  const adminEmail = admin?.email || "—";
  const adminType = admin?.user_type || "—";
  const visibleMessage = message.text;

  const clearMessage = useCallback(() => setMessage({ text: "", type: "error" }), []);

  const showMessage = useCallback((text, type = "error") => {
    setMessage({ text, type });
  }, []);

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    navigate("/admin-login", { replace: true });
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

  const fetchReportData = useCallback(async (type, filters, exportMode = false) => {
    const endpointMap = {
      bookings: "/admin/reports/bookings",
      revenue: "/admin/reports/revenue",
      customers: "/admin/reports/customers",
    };

    const query = new URLSearchParams(filters);

    if (exportMode) {
      query.set("export", "1");
    }

    const result = await requestAdminApi(`${endpointMap[type]}?${query.toString()}`, {
      method: "GET",
    });

    return normalizeApiData(result) || {};
  }, []);

  const loadBookingReport = useCallback(
    async (filters = bookingFilters) => {
      clearMessage();
      setLoadingType("bookings");

      try {
        const data = await fetchReportData("bookings", filters, false);
        setBookingReport(data);
      } catch (error) {
        handleAdminError(error, "Unable to load booking report.");
      } finally {
        setLoadingType("");
      }
    },
    [bookingFilters, clearMessage, fetchReportData, handleAdminError]
  );

  const loadRevenueReport = useCallback(
    async (filters = revenueFilters) => {
      clearMessage();
      setLoadingType("revenue");

      try {
        const data = await fetchReportData("revenue", filters, false);
        setRevenueReport(data);
      } catch (error) {
        handleAdminError(error, "Unable to load revenue report.");
      } finally {
        setLoadingType("");
      }
    },
    [revenueFilters, clearMessage, fetchReportData, handleAdminError]
  );

  const loadCustomerReport = useCallback(
    async (filters = customerFilters) => {
      clearMessage();
      setLoadingType("customers");

      try {
        const data = await fetchReportData("customers", filters, false);
        setCustomerReport(data);
      } catch (error) {
        handleAdminError(error, "Unable to load customer report.");
      } finally {
        setLoadingType("");
      }
    },
    [customerFilters, clearMessage, fetchReportData, handleAdminError]
  );

  useEffect(() => {
    if (!getAdminToken()) {
      redirectToLogin();
      return;
    }

    document.body.classList.add("admin-layout");

    const storedAdmin = getStoredAdmin();
    if (storedAdmin) setAdmin(storedAdmin);

    loadBookingReport();
    loadRevenueReport();
    loadCustomerReport();

    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, [loadBookingReport, loadCustomerReport, loadRevenueReport, redirectToLogin]);

  const resetBookingFilters = useCallback(() => {
    const nextFilters = { from: monthStartDate(), to: todayDate(), status: "all" };
    setBookingFilters(nextFilters);
    loadBookingReport(nextFilters);
  }, [loadBookingReport]);

  const resetRevenueFilters = useCallback(() => {
    const nextFilters = {
      from: monthStartDate(),
      to: todayDate(),
      group_by: "month",
      payment_method: "all",
    };
    setRevenueFilters(nextFilters);
    loadRevenueReport(nextFilters);
  }, [loadRevenueReport]);

  const resetCustomerFilters = useCallback(() => {
    const nextFilters = { from: monthStartDate(), to: todayDate(), search: "" };
    setCustomerFilters(nextFilters);
    loadCustomerReport(nextFilters);
  }, [loadCustomerReport]);

  const exportReport = useCallback(
    async (type, format) => {
      clearMessage();

      const config = {
        bookings: {
          title: "Booking Report",
          filters: bookingFilters,
          fileName: `booking_report_${bookingFilters.from}_to_${bookingFilters.to}`,
          getSections: getBookingReportExportSections,
        },
        revenue: {
          title: "Revenue Report",
          filters: revenueFilters,
          fileName: `revenue_report_${revenueFilters.from}_to_${revenueFilters.to}`,
          getSections: getRevenueReportExportSections,
        },
        customers: {
          title: "Customer Report",
          filters: customerFilters,
          fileName: `customer_report_${customerFilters.from}_to_${customerFilters.to}`,
          getSections: getCustomerReportExportSections,
        },
      }[type];

      try {
        setLoadingType(`${type}-${format}`);

        const freshData = await fetchReportData(type, config.filters, true);
        const sections = config.getSections(freshData);

        if (type === "bookings") setBookingReport(freshData);
        if (type === "revenue") setRevenueReport(freshData);
        if (type === "customers") setCustomerReport(freshData);

        if (format === "excel") {
          exportExcelReport(
            config.fileName,
            sections.map((section) => ({
              name: section.name,
              rows: section.rows,
            }))
          );
        }

        if (format === "pdf") {
          exportPdfReport(config.title, config.fileName, config.filters, sections);
        }

        if (format === "print") {
          printReport(config.title, config.filters, sections);
        }
      } catch (error) {
        handleAdminError(error, `Unable to export ${config.title}.`);
      } finally {
        setLoadingType("");
      }
    },
    [
      bookingFilters,
      clearMessage,
      customerFilters,
      fetchReportData,
      handleAdminError,
      revenueFilters,
    ]
  );

  const activeContent = useMemo(() => {
    if (activeTab === "bookings") {
      const isLoading = loadingType.startsWith("bookings");

      return (
        <BookingReport
          filters={bookingFilters}
          setFilters={setBookingFilters}
          data={bookingReport}
          isLoading={isLoading}
          onSubmit={(event) => {
            event.preventDefault();
            loadBookingReport(bookingFilters);
          }}
          onReset={resetBookingFilters}
          onExportExcel={() => exportReport("bookings", "excel")}
          onExportPdf={() => exportReport("bookings", "pdf")}
          onPrint={() => exportReport("bookings", "print")}
        />
      );
    }

    if (activeTab === "revenue") {
      const isLoading = loadingType.startsWith("revenue");

      return (
        <RevenueReport
          filters={revenueFilters}
          setFilters={setRevenueFilters}
          data={revenueReport}
          isLoading={isLoading}
          onSubmit={(event) => {
            event.preventDefault();
            loadRevenueReport(revenueFilters);
          }}
          onReset={resetRevenueFilters}
          onExportExcel={() => exportReport("revenue", "excel")}
          onExportPdf={() => exportReport("revenue", "pdf")}
          onPrint={() => exportReport("revenue", "print")}
        />
      );
    }

    const isLoading = loadingType.startsWith("customers");

    return (
      <CustomerReport
        filters={customerFilters}
        setFilters={setCustomerFilters}
        data={customerReport}
        isLoading={isLoading}
        onSubmit={(event) => {
          event.preventDefault();
          loadCustomerReport(customerFilters);
        }}
        onReset={resetCustomerFilters}
        onExportExcel={() => exportReport("customers", "excel")}
        onExportPdf={() => exportReport("customers", "pdf")}
        onPrint={() => exportReport("customers", "print")}
      />
    );
  }, [
    activeTab,
    bookingFilters,
    bookingReport,
    customerFilters,
    customerReport,
    exportReport,
    loadBookingReport,
    loadCustomerReport,
    loadRevenueReport,
    loadingType,
    resetBookingFilters,
    resetCustomerFilters,
    resetRevenueFilters,
    revenueFilters,
    revenueReport,
  ]);

  return (
    <>
      <style>{adminReportsStyles}</style>

      <Sidebar admin={admin} />

      <main className="admin-main">
        <div className="container">
          <div className="page-header">
            <div className="page-title">
              <h1>Reports</h1>
              <p className="muted">
                {adminName} · {adminEmail} · {adminType}
              </p>
              <p className="muted">
                Booking, revenue and customer reports for Elite Convention Hall.
              </p>
            </div>
          </div>

          {visibleMessage ? (
            <div className={`message-banner ${message.type}`}>
              <IconInfo />
              <span>{message.text}</span>
            </div>
          ) : null}

          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`.trim()}
              onClick={() => setActiveTab("bookings")}
            >
              Booking Report
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "revenue" ? "active" : ""}`.trim()}
              onClick={() => setActiveTab("revenue")}
            >
              Revenue Report
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "customers" ? "active" : ""}`.trim()}
              onClick={() => setActiveTab("customers")}
            >
              Customer Report
            </button>
          </div>

          {activeContent}
        </div>
      </main>
    </>
  );
}