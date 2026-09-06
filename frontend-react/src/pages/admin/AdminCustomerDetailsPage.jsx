import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import Sidebar from "../../components/Sidebar";

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";
const CUSTOMER_DETAILS_CACHE_PREFIX = "dlc_admin_customer_details_cache_v1";
const CUSTOMER_DETAILS_CACHE_TTL_MS = 5 * 60 * 1000;
const CUSTOMER_LIST_CACHE_PREFIX = "dlc_admin_customers_cache_v1";
const CUSTOMER_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

const adminCustomerDetailsStyles = String.raw`
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

  .top-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .filter-btn,
  .secondary-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border: none;
    border-radius: 12px;
    font-family: inherit;
    font-weight: 800;
    font-size: 13.5px;
    cursor: pointer;
    text-decoration: none;
    transition: box-shadow var(--transition), transform var(--transition);
  }

  .filter-btn {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white;
  }

  .secondary-btn {
    background: var(--gold-pale);
    color: var(--gold-dark);
    border: 1px solid var(--gold-border);
  }

  .filter-btn:hover,
  .secondary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px var(--gold-glow);
  }

  .filter-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
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

  .stat-card,
  .panel {
    background: var(--white);
    border: 1px solid var(--gold-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .stat-card {
    padding: 24px 22px;
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

  .details-grid {
    display: grid;
    grid-template-columns: 1.35fr 0.65fr;
    gap: 18px;
    margin-bottom: 28px;
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

  .panel-body {
    padding: 22px;
  }

  .info-grid {
    display: grid;
    gap: 14px;
  }

  .info-row {
    display: grid;
    grid-template-columns: 170px 1fr;
    gap: 12px;
    padding-bottom: 13px;
    border-bottom: 1px solid #f1eadc;
  }

  .info-label {
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
  }

  .info-value {
    color: var(--text);
    font-size: 13.5px;
    font-weight: 700;
    word-break: break-word;
  }

  .status-form {
    display: grid;
    gap: 12px;
  }

  .status-form label {
    font-size: 13px;
    font-weight: 800;
    color: var(--gold-dark);
  }

  .status-form select {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #e0e0e0;
    border-radius: 14px;
    font-family: inherit;
    font-size: 13.5px;
    background: var(--bg);
    color: var(--text);
    outline: none;
  }

  .hint {
    margin-top: 12px;
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.6;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1120px;
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

  @media (max-width: 900px) {
    .details-grid {
      grid-template-columns: 1fr;
    }

    .info-row {
      grid-template-columns: 1fr;
    }

    .container {
      width: 94%;
      padding-top: 24px;
    }

    .page-title h1 {
      font-size: 27px;
    }
  }
`;
function makeCustomerDetailsCacheKey(customerId) {
  return `${CUSTOMER_DETAILS_CACHE_PREFIX}:${customerId}`;
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

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString()}`;
}

function fmtDate(value) {
  if (!value) return "—";

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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

function IconMoney({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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

export default function AdminCustomerDetailsPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => getStoredAdmin() || {});
  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState({});
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "error",
  });

  const visibleMessage = message.text;

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

const loadCustomerDetails = useCallback(async () => {
  clearMessage();

  const cacheKey = makeCustomerDetailsCacheKey(customerId);
  const cachedData = readSessionCache(cacheKey, CUSTOMER_DETAILS_CACHE_TTL_MS);

  if (cachedData) {
    setCustomer(cachedData.customer || null);
    setSummary(cachedData.summary || {});
    setBookings(Array.isArray(cachedData.bookings) ? cachedData.bookings : []);
    setPayments(Array.isArray(cachedData.payments) ? cachedData.payments : []);
    setSelectedStatus(cachedData.customer?.status || "active");
    setIsLoading(false);
  } else {
    setIsLoading(true);
  }

  try {
    const result = await requestAdminApi(`/admin/customers/${customerId}`, {
      method: "GET",
    });

    const data = normalizeApiData(result) || {};

    const nextData = {
      customer: data.customer || null,
      summary: data.summary || {},
      bookings: Array.isArray(data.bookings) ? data.bookings : [],
      payments: Array.isArray(data.payments) ? data.payments : [],
    };

    setCustomer(nextData.customer);
    setSummary(nextData.summary);
    setBookings(nextData.bookings);
    setPayments(nextData.payments);
    setSelectedStatus(nextData.customer?.status || "active");

    writeSessionCache(cacheKey, nextData);
  } catch (error) {
    if (!cachedData) {
      handleAdminError(error, "Unable to load customer details.");
    }
  } finally {
    setIsLoading(false);
  }
}, [clearMessage, customerId, handleAdminError]);

  useEffect(() => {
    if (!getAdminToken()) {
      redirectToLogin();
      return;
    }

    document.body.classList.add("admin-layout");

    const storedAdmin = getStoredAdmin();
    if (storedAdmin) setAdmin(storedAdmin);

    loadCustomerDetails();

    return () => {
      document.body.classList.remove("admin-layout");
    };
  }, [loadCustomerDetails, redirectToLogin]);

  async function updateCustomerStatus() {
    clearMessage();
    setIsStatusSaving(true);

    try {
      const result = await requestAdminApi(`/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selectedStatus,
        }),
      });

      const data = normalizeApiData(result) || {};

const nextStatus = data.status || selectedStatus;

const updatedCustomer = {
  ...customer,
  status: nextStatus,
};

setCustomer(updatedCustomer);

writeSessionCache(makeCustomerDetailsCacheKey(customerId), {
  customer: updatedCustomer,
  summary,
  bookings,
  payments,
});

updateCustomerInListCaches(customerId, {
  status: nextStatus,
});

      showMessage(result.message || "Customer status updated successfully.", "success");
    } catch (error) {
      handleAdminError(error, "Unable to update customer status.");
    } finally {
      setIsStatusSaving(false);
    }
  }

  return (
    <>
      <style>{adminCustomerDetailsStyles}</style>

      <Sidebar admin={admin} />

      <main className="admin-main">
        <div className="container">
          <div className="page-header">
            <div className="page-title">
              <h1>{customer?.name || "Customer Details"}</h1>
              <p className="muted">
                {customer?.customer_code || `Customer ID: ${customerId}`} · {customer?.email || "—"} · {customer?.phone || "—"}
              </p>
              <p className="muted">
                View personal information, booking history, payment history and update account status.
              </p>
            </div>

            <div className="top-actions">
              <button className="secondary-btn" type="button" onClick={() => navigate("/admin-customers")}>
                Back to Customers
              </button>
            </div>
          </div>

          {visibleMessage ? (
            <div className={`message-banner ${message.type}`}>
              <IconInfo />
              <span>{message.text}</span>
            </div>
          ) : null}

          {isLoading && !customer ? (
            <div className="panel">
    <div className="empty-state">Loading customer details...</div>
  </div>
) : !customer ? (
            <div className="panel">
              <div className="empty-state">Customer not found.</div>
            </div>
          ) : (
            <>
              <p className="section-label">Summary</p>

              <div className="stats-row">
                <StatCard icon={<IconUsers />} label="Total Bookings" value={summary.total_bookings ?? 0} />
                <StatCard icon={<IconInfo />} label="Confirmed" value={summary.confirmed_bookings ?? 0} />
                <StatCard icon={<IconMoney />} label="Booking Amount" value={money(summary.total_booking_amount)} />
                <StatCard icon={<IconMoney />} label="Success Payment" value={money(summary.total_success_payment)} />
              </div>

              <p className="section-label">Customer Profile</p>

              <div className="details-grid">
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <div className="panel-icon">
                        <IconUser />
                      </div>

                      <div>
                        <h2>Personal Information</h2>
                        <p className="muted">Customer account and profile information</p>
                      </div>
                    </div>

                    <StatusBadge status={customer.status} />
                  </div>

                  <div className="panel-body">
                    <div className="info-grid">
                      <div className="info-row">
                        <span className="info-label">Name</span>
                        <span className="info-value">{customer.name || "—"}</span>
                      </div>

                      <div className="info-row">
                        <span className="info-label">Email</span>
                        <span className="info-value">{customer.email || "—"}</span>
                      </div>

                      <div className="info-row">
                        <span className="info-label">Phone</span>
                        <span className="info-value">{customer.phone || "—"}</span>
                      </div>

                      <div className="info-row">
                        <span className="info-label">Address</span>
                        <span className="info-value">{customer.address || "—"}</span>
                      </div>

                      <div className="info-row">
                        <span className="info-label">NID / Passport</span>
                        <span className="info-value">{customer.nid_or_passport || "—"}</span>
                      </div>

                      <div className="info-row">
                        <span className="info-label">Joined</span>
                        <span className="info-value">{fmtDate(customer.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <div className="panel-icon">
                        <IconInfo />
                      </div>

                      <div>
                        <h2>Account Status</h2>
                        <p className="muted">Activate, deactivate or block customer</p>
                      </div>
                    </div>
                  </div>

                  <div className="panel-body">
                    <div className="status-form">
                      <label htmlFor="customer-status">Customer Status</label>

                      <select
                        id="customer-status"
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="blocked">Blocked</option>
                      </select>

                      <button
                        className="filter-btn"
                        type="button"
                        disabled={isStatusSaving || selectedStatus === customer.status}
                        onClick={updateCustomerStatus}
                      >
                        {isStatusSaving ? "Updating..." : "Update Status"}
                      </button>
                    </div>

                    <p className="hint">
                      Customer login already checks active status. Inactive or blocked customers will not be able to login normally.
                    </p>
                  </div>
                </div>
              </div>

              <p className="section-label">Booking History</p>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <div className="panel-icon">
                      <IconUsers />
                    </div>

                    <div>
                      <h2>Bookings</h2>
                      <p className="muted">All booking records for this customer</p>
                    </div>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Event</th>
                        <th>Slot</th>
                        <th>Guests</th>
                        <th>Amount</th>
                        <th>Booking Status</th>
                        <th>Payment</th>
                        <th>Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan="8">
                            <div className="empty-state">No booking history found.</div>
                          </td>
                        </tr>
                      ) : (
                        bookings.map((booking) => (
                          <tr key={booking.id}>
                            <td>
                              <div className="cell-primary">
                                <Link to={`/admin-booking-details/${booking.id}`}>
                                  {booking.booking_no || `#${booking.id}`}
                                </Link>
                              </div>
                              <div className="cell-sub">
                                <span>Source: {booking.booking_source || "—"}</span>
                              </div>
                            </td>

                            <td>
                              <div className="cell-primary">{booking.event_title || "—"}</div>
                              <div className="cell-sub">
                                <span>Type: {booking.event_type || "—"}</span>
                                <span>{booking.event_details || "—"}</span>
                              </div>
                            </td>

                            <td>
                              <div className="cell-primary">{booking.slot_date || "—"}</div>
                              <div className="cell-sub">
                                <span>Hall: {booking.hall_name || "—"}</span>
                                <span>Shift: {booking.shift_name || "—"}</span>
                                <span>
                                  {booking.start_time || ""}
                                  {booking.end_time ? ` – ${booking.end_time}` : ""}
                                </span>
                              </div>
                            </td>

                            <td>{booking.guest_count || "—"}</td>

                            <td>
                              <span className="money-cell">{money(booking.total_amount)}</span>
                            </td>

                            <td>
                              <StatusBadge status={booking.booking_status} />
                            </td>

                            <td>
                              <StatusBadge status={booking.payment_status || "pending"} />
                              <div className="cell-sub" style={{ marginTop: "6px" }}>
                                <span>{money(booking.payment_amount)}</span>
                                <span>{booking.payment_method || "—"}</span>
                              </div>
                            </td>

                            <td>
                              <div className="cell-sub">
                                <span>{fmtDate(booking.created_at)}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="section-label">Payment History</p>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <div className="panel-icon">
                      <IconMoney />
                    </div>

                    <div>
                      <h2>Payments</h2>
                      <p className="muted">All payment records connected with this customer</p>
                    </div>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Event</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Transaction</th>
                        <th>Card</th>
                        <th>Paid At</th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan="8">
                            <div className="empty-state">No payment history found.</div>
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              <Link to={`/admin-booking-details/${payment.booking_id}`}>
                                {payment.booking_no || `#${payment.booking_id}`}
                              </Link>
                            </td>

                            <td>{payment.event_title || "—"}</td>

                            <td>
                              <span className="money-cell">{money(payment.amount)}</span>
                            </td>

                            <td>{payment.payment_method || "—"}</td>

                            <td>
                              <StatusBadge status={payment.payment_status} />
                            </td>

                            <td>{payment.transaction_reference || "—"}</td>

                            <td>
                              {payment.card_last_four ? `**** ${payment.card_last_four}` : "—"}
                            </td>

                            <td>{fmtDate(payment.paid_at || payment.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}