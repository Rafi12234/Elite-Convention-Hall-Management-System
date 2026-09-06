import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import Sidebar from "../../components/Sidebar";

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";
const CUSTOMER_LIST_CACHE_PREFIX = "dlc_admin_customers_cache_v1";
const CUSTOMER_LIST_LAST_STATE_KEY = "dlc_admin_customers_last_state_v1";
const CUSTOMER_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

const adminCustomersStyles = String.raw`
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
  }

  .search-wrap {
    position: relative;
    min-width: 320px;
  }

  .search-input {
    width: 100%;
    padding: 11px 42px 11px 38px;
    border: 1.5px solid #e0e0e0;
    border-radius: 14px;
    font-family: inherit;
    font-size: 13.5px;
    background: var(--bg);
    color: var(--text);
    outline: none;
    transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
  }

  .search-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-glow);
    background: var(--white);
  }

  .search-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
  }

  .search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%) scale(0.85);
    opacity: 0;
    pointer-events: none;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(220,53,69,0.10);
    color: var(--red);
    cursor: pointer;
    transition: all var(--transition);
  }

  .search-clear.visible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(-50%) scale(1);
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
    transition: box-shadow var(--transition), transform var(--transition);
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

  .search-status {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--gold-dark);
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    border-radius: 999px;
    padding: 7px 11px;
    white-space: nowrap;
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
    font-size: 28px;
    font-weight: 800;
    color: var(--text);
  }

  .panel {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
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

  .record-badge {
    display: inline-flex;
    align-items: center;
    padding: 7px 12px;
    border-radius: 999px;
    background: var(--gold-pale);
    color: var(--gold-dark);
    border: 1px solid var(--gold-border);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1080px;
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

  .customer-code {
    display: inline-flex;
    padding: 5px 9px;
    border-radius: 999px;
    background: var(--gold-pale);
    color: var(--gold-dark);
    border: 1px solid var(--gold-border);
    font-size: 12px;
    font-weight: 800;
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

  .btn-action {
    border: none;
    border-radius: 10px;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
  }

  .btn-view {
    background: rgba(184,134,11,0.12);
    color: var(--gold-dark);
    border: 1px solid var(--gold-border);
  }

  .btn-view:hover {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    transform: translateY(-2px);
  }

  .pagination {
    padding: 18px 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border-top: 1px solid var(--gold-border);
    flex-wrap: wrap;
  }

  .pagination button {
    border: none;
    border-radius: 12px;
    padding: 10px 16px;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
    font-family: inherit;
    font-weight: 800;
    cursor: pointer;
  }

  .pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    padding: 42px 18px;
    text-align: center;
    color: var(--muted);
  }

  @media (max-width: 760px) {
    .container {
      width: 94%;
      padding-top: 24px;
    }

    .page-title h1 {
      font-size: 27px;
    }

    .search-wrap {
      min-width: 100%;
    }

    .filter-box {
      width: 100%;
    }
  }
`;
function makeCustomerListCacheKey(page = 1, keyword = "") {
  const cleanKeyword = String(keyword || "").trim().toLowerCase();

  return `${CUSTOMER_LIST_CACHE_PREFIX}:${page}:${cleanKeyword}`;
}

function readSessionCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw);

    if (!cached?.saved_at || !cached?.data) {
      sessionStorage.removeItem(key);
      return null;
    }

    if (Date.now() - cached.saved_at > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function writeSessionCache(key, data) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        saved_at: Date.now(),
        data,
      })
    );
  } catch {
    // Ignore storage errors silently.
  }
}

function readCustomerListLastState() {
  try {
    const raw = sessionStorage.getItem(CUSTOMER_LIST_LAST_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCustomerListLastState(state) {
  try {
    sessionStorage.setItem(CUSTOMER_LIST_LAST_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors silently.
  }
}

function updateCustomerInListCaches(customerId, patch) {
  try {
    const id = Number(customerId);

    Object.keys(sessionStorage).forEach((key) => {
      if (!key.startsWith(`${CUSTOMER_LIST_CACHE_PREFIX}:`)) return;

      const cached = readSessionCache(key, CUSTOMER_LIST_CACHE_TTL_MS);
      if (!cached?.customers) return;

      const updatedCustomers = cached.customers.map((customer) =>
        Number(customer.id) === id
          ? {
              ...customer,
              ...patch,
            }
          : customer
      );

      writeSessionCache(key, {
        ...cached,
        customers: updatedCustomers,
      });
    });
  } catch {
    // Ignore cache update errors silently.
  }
}
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

function badgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (["active", "confirmed", "success", "paid"].includes(value)) return "badge-success";
  if (["pending", "inactive", "partial"].includes(value)) return "badge-warning";
  if (["blocked", "cancelled", "failed", "rejected"].includes(value)) return "badge-danger";

  return "badge-muted";
}

function recordLabel(count) {
  return `${count} record${count !== 1 ? "s" : ""}`;
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

function IconInfo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const latestRequestIdRef = useRef(0);

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({
    text: "",
    type: "error",
  });

  const adminName = admin?.name || "Admin";
  const adminEmail = admin?.email || "—";
  const adminType = admin?.user_type || "—";

  const visibleMessage = message.text;
  const filteredCustomers = useMemo(() => customers, [customers]);

  const showMessage = useCallback((text, type = "error") => {
    setMessage({ text, type });
  }, []);

  const clearMessage = useCallback(() => {
    setMessage({ text: "", type: "error" });
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

const loadCustomers = useCallback(
  async (page = 1, keyword = "", options = {}) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const cleanKeyword = String(keyword || "").trim();
    const cacheKey = makeCustomerListCacheKey(page, cleanKeyword);
    const cachedData = readSessionCache(cacheKey, CUSTOMER_LIST_CACHE_TTL_MS);

    if (cachedData && !options.forceRefresh) {
      setCustomers(Array.isArray(cachedData.customers) ? cachedData.customers : []);
      setSummary(cachedData.summary || {});
      setPagination(
        cachedData.pagination || {
          current_page: page,
          last_page: 1,
          per_page: 15,
          total: 0,
        }
      );

      if (cachedData.admin) {
        setAdmin(cachedData.admin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(cachedData.admin));
      }

      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    clearMessage();

    try {
      const query = new URLSearchParams({
        page: String(page),
        per_page: "15",
      });

      if (cleanKeyword) {
        query.set("search", cleanKeyword);
      }

      const result = await requestAdminApi(`/admin/customers?${query.toString()}`, {
        method: "GET",
      });

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      const data = normalizeApiData(result) || {};

      const nextData = {
        admin: data.admin || null,
        customers: Array.isArray(data.customers) ? data.customers : [],
        summary: data.summary || {},
        pagination:
          data.pagination || {
            current_page: page,
            last_page: 1,
            per_page: 15,
            total: 0,
          },
      };

      setCustomers(nextData.customers);
      setSummary(nextData.summary);
      setPagination(nextData.pagination);

      if (nextData.admin) {
        setAdmin(nextData.admin);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextData.admin));
      }

      writeSessionCache(cacheKey, nextData);
      writeCustomerListLastState({
        page,
        searchKeyword: cleanKeyword,
        activeSearch: cleanKeyword,
      });
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      if (!cachedData) {
        setCustomers([]);
        handleAdminError(error, "Unable to load customers.");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  },
  [clearMessage, handleAdminError]
);

useEffect(() => {
  if (!getAdminToken()) {
    redirectToLogin();
    return;
  }

  document.body.classList.add("admin-layout");

  const storedAdmin = getStoredAdmin();
  if (storedAdmin) setAdmin(storedAdmin);

  const lastState = readCustomerListLastState();

  if (lastState?.searchKeyword) {
    setSearchKeyword(lastState.searchKeyword);
    setActiveSearch(lastState.activeSearch || lastState.searchKeyword);
  } else {
    loadCustomers(1, "");
  }

  return () => {
    document.body.classList.remove("admin-layout");
  };
}, [loadCustomers, redirectToLogin]);

useEffect(() => {
  if (!getAdminToken()) {
    return;
  }

  const keyword = searchKeyword.trim();

  const timeoutId = window.setTimeout(() => {
    setActiveSearch(keyword);
    loadCustomers(1, keyword);
  }, 350);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [searchKeyword, loadCustomers]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    const keyword = searchKeyword.trim();
    setActiveSearch(keyword);
    loadCustomers(1, keyword);
  }

  function clearSearch() {
    setSearchKeyword("");
    setActiveSearch("");
  }

  return (
    <>
      <style>{adminCustomersStyles}</style>

      <Sidebar admin={admin} />

      <main className="admin-main">
        <div className="container">
          <div className="page-header">
            <div className="page-title">
              <h1>Customer Management</h1>
              <p className="muted">
                {adminName} · {adminEmail} · {adminType}
              </p>
              <p className="muted">
                Search customers, view profile details, booking history, payment history and account status.
              </p>
            </div>

            <form className="filter-box" onSubmit={handleSearchSubmit}>
              <div className="search-wrap">
                <IconSearch className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search name, email, phone, code, address…"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                />

                <button
                  className={`search-clear ${searchKeyword.trim() ? "visible" : ""}`.trim()}
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <IconClose />
                </button>
              </div>

              {isLoading ? <span className="search-status">Searching...</span> : null}
            </form>
          </div>

          {visibleMessage ? (
            <div className={`message-banner ${message.type}`}>
              <IconInfo />
              <span>{message.text}</span>
            </div>
          ) : null}

          <p className="section-label">Summary</p>

          <div className="stats-row">
            <StatCard icon={<IconUsers />} label="Total Customers" value={summary.total_customers ?? "—"} />
            <StatCard icon={<IconUser />} label="Active Customers" value={summary.active_customers ?? "—"} />
            <StatCard icon={<IconInfo />} label="Inactive Customers" value={summary.inactive_customers ?? "—"} />
            <StatCard icon={<IconClose />} label="Blocked Customers" value={summary.blocked_customers ?? "—"} />
          </div>

          <p className="section-label">Records</p>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-icon">
                  <IconUsers />
                </div>

                <div>
                  <h2>All Customers</h2>
                  <p className="muted">
                    {activeSearch ? `Search result for "${activeSearch}"` : "Registered customer accounts"}
                  </p>
                </div>
              </div>

              <span className="record-badge">
                {recordLabel(pagination.total || filteredCustomers.length)}
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Total Bookings</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">Loading customers...</div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          {activeSearch ? "No customers match your search." : "No customers found."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <div className="cell-primary">{customer.name || "—"}</div>
                          <span className="customer-code">
                            {customer.customer_code || `CUST-${customer.id}`}
                          </span>
                        </td>

                        <td>
                          <div className="cell-sub">
                            <span>✉ {customer.email || "—"}</span>
                            <span>📞 {customer.phone || "—"}</span>
                          </div>
                        </td>

                        <td>
                          <div className="cell-sub">
                            <span>{customer.address || "—"}</span>
                          </div>
                        </td>

                        <td>
                          <StatusBadge status={customer.status} />
                        </td>

                        <td>
                          <div className="cell-primary">{customer.total_bookings || 0}</div>
                        </td>

                        <td>
                          <div className="cell-sub">
                            <span>{customer.created_at || "—"}</span>
                          </div>
                        </td>

                        <td>
                          <button
                            className="btn-action btn-view"
                            type="button"
                            onClick={() => navigate(`/admin-customers/${customer.id}`)}
                          >
                            👁 View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                type="button"
                disabled={isLoading || Number(pagination.current_page) <= 1}
                onClick={() => loadCustomers(Number(pagination.current_page) - 1, activeSearch)}
              >
                Previous
              </button>

              <span className="muted">
                Page {pagination.current_page || 1} of {pagination.last_page || 1}
              </span>

              <button
                type="button"
                disabled={isLoading || Number(pagination.current_page) >= Number(pagination.last_page)}
                onClick={() => loadCustomers(Number(pagination.current_page) + 1, activeSearch)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}