import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString()}`;
}

function fmtDateTime(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function adminApi(endpoint, options = {}) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    const error = new Error("Unauthenticated admin.");
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      result?.message ||
      (result?.errors ? Object.values(result.errors).flat().join("\n") : "") ||
      "Request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return result;
}

function createEmptyRow() {
  return {
    _id: Math.random().toString(36).slice(2),
    categoryId: "",
    newCategoryName: "",
    amount: "",
    paymentStatus: "due",
    notes: "",
    saving: false,
    saved: false,
    error: "",
  };
}

/* ─── SVG ICON COMPONENTS ─── */
function IconArrowLeft({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
    </svg>
  );
}
function IconRefresh({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
function IconPrint({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}
function IconCheckCircle({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}
function IconAlertCircle({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconUser({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconFile({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
function IconShield({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconCalendar({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconPlus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconX({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconSave({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}
function IconTrash({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}
function IconCheck({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconUndo({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}
function IconCreditCard({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconBarChart({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconBuilding({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}
function IconClipboard({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function IconTag({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function IconEdit({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconTaka({ size = 14 }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        fontFamily: "'Poppins', sans-serif",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      ৳
    </span>
  );
}
function IconPin({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconNote({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8" />
    </svg>
  );
}

/* ─────────────────────────────────────────── */

export default function AdminBookingDetailsPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [charges, setCharges] = useState([]);
  const [categories, setCategories] = useState([]);

  const [rows, setRows] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  const pageTotals = useMemo(() => {
    const mainAmount = Number(booking?.total_amount || 0);
    const extraTotal = charges.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const extraPaid = charges
      .filter((r) => r.payment_status === "paid")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const extraDue = charges
      .filter((r) => r.payment_status === "due")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    return {
      mainAmount,
      extraTotal,
      extraPaid,
      extraDue,
      grandTotal: mainAmount + extraTotal,
    };
  }, [booking, charges]);

  async function loadDetails(silent = false) {
    if (!silent) setIsLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const result = await adminApi(`/admin/bookings/${bookingId}/details`);
      const data = result.data || {};
      setBooking(data.booking || null);
      setCharges(data.extra_charges || []);
      setCategories(data.extra_charge_categories || []);
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        navigate("/admin-login", { replace: true });
        return;
      }
      setMessage({ text: error.message || "Failed to load booking details.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r._id !== id));
  }

  function updateRow(id, field, value) {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value, error: "" } : r))
    );
  }

  async function saveRow(id) {
    const row = rows.find((r) => r._id === id);
    if (!row) return;

    if (!row.categoryId) {
      setRows((prev) =>
        prev.map((r) => r._id === id ? { ...r, error: "Please select a charge type." } : r)
      );
      return;
    }
    if (row.categoryId === "__new__" && !row.newCategoryName.trim()) {
      setRows((prev) =>
        prev.map((r) => r._id === id ? { ...r, error: "Please enter the new charge type name." } : r)
      );
      return;
    }
    if (!row.amount || Number(row.amount) <= 0) {
      setRows((prev) =>
        prev.map((r) => r._id === id ? { ...r, error: "Please enter a valid amount." } : r)
      );
      return;
    }

    setRows((prev) =>
      prev.map((r) => r._id === id ? { ...r, saving: true, error: "" } : r)
    );

    try {
      await adminApi(`/admin/bookings/${bookingId}/extra-charges`, {
        method: "POST",
        body: JSON.stringify({
          extra_charge_category_id:
            row.categoryId === "__new__" ? null : Number(row.categoryId),
          new_category_name:
            row.categoryId === "__new__" ? row.newCategoryName : null,
          amount: Number(row.amount),
          payment_status: row.paymentStatus,
          payment_method: "cash",
          notes: row.notes,
        }),
      });

      setRows((prev) =>
        prev.map((r) => r._id === id ? { ...r, saving: false, saved: true } : r)
      );

      setTimeout(() => {
        setRows((prev) => prev.filter((r) => r._id !== id));
      }, 650);

      setMessage({ text: "Extra charge added successfully.", type: "success" });
      await loadDetails(true);
    } catch (error) {
      setRows((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, saving: false, error: error.message || "Failed to save." } : r
        )
      );
    }
  }

  async function updateChargeStatus(charge, newStatus) {
    setMessage({ text: "", type: "" });
    setUpdatingId(charge.id);
    try {
      await adminApi(`/admin/bookings/${bookingId}/extra-charges/${charge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ payment_status: newStatus }),
      });
      setMessage({ text: "Extra charge status updated.", type: "success" });
      await loadDetails(true);
    } catch (error) {
      setMessage({ text: error.message || "Failed to update.", type: "error" });
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteCharge(charge) {
    if (!window.confirm(`Delete "${charge.title}" charge?`)) return;
    setMessage({ text: "", type: "" });
    setDeletingId(charge.id);
    try {
      await adminApi(`/admin/bookings/${bookingId}/extra-charges/${charge.id}`, {
        method: "DELETE",
      });
      setMessage({ text: "Extra charge deleted.", type: "success" });
      await loadDetails(true);
    } catch (error) {
      setMessage({ text: error.message || "Failed to delete.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [bookingId]);

  return (
    <>
      <style>{styles}</style>
      <main className="page-wrapper">

        {/* ── TOP BAR ── */}
        <div className="topbar no-print">
          <Link className="back-btn" to="/admin-bookings">
            <IconArrowLeft size={18} />
            Back to Bookings
          </Link>
          <div className="topbar-right">
            <button className="action-btn secondary" type="button" onClick={() => loadDetails()}>
              <IconRefresh size={16} />
              Refresh
            </button>
            <button className="action-btn primary" type="button" onClick={() => window.print()}>
              <IconPrint size={16} />
              Print / PDF
            </button>
          </div>
        </div>

        {/* ── ALERT ── */}
        {message.text && (
          <div className={`alert-banner no-print ${message.type}`}>
            <span className="alert-icon">
              {message.type === "success"
                ? <IconCheckCircle size={20} />
                : <IconAlertCircle size={20} />}
            </span>
            {message.text}
            <button
              className="alert-close"
              onClick={() => setMessage({ text: "", type: "" })}
            >
              ×
            </button>
          </div>
        )}

        {/* ── LOADING / EMPTY ── */}
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading booking invoice…</p>
          </div>
        ) : !booking ? (
          <div className="empty-state">
            <span className="empty-icon-wrap"><IconFile size={40} /></span>
            <h3>Booking Not Found</h3>
            <p>The requested booking could not be located.</p>
          </div>
        ) : (
          <div className="invoice-wrapper printable-area">

            {/* ══ HERO ══ */}
            <div className="invoice-hero">
              <div className="hero-left">
                <img
                  src="/assets/img/ECH-02.png"
                  alt="Elite Convention Hall"
                  className="hero-logo"
                />
                <p className="hero-tagline">Premium Convention & Party Venue in Dhaka</p>
                <span className={`status-pill ${booking.booking_status}`}>
                  {booking.booking_status}
                </span>
              </div>
              <div className="hero-right">
                <div className="invoice-stamp">
                  <p className="stamp-label">INVOICE</p>
                  <p className="stamp-number">{booking.booking_no}</p>
                  <p className="stamp-date">
                    {fmtDateTime(booking.booked_at || booking.created_at)}
                  </p>
                  <div className="stamp-glow" />
                </div>
              </div>
              <div className="hero-bg-circle" />
            </div>

            {/* ══ INFO CARDS ══ */}
            <div className="info-cards-grid">
              <InfoCard icon={<IconUser size={18} />} title="Customer">
                <InfoRow label="Name"    value={booking.customer_name} />
                <InfoRow label="Email"   value={booking.customer_email} />
                <InfoRow label="Phone"   value={booking.customer_phone} />
                <InfoRow label="Address" value={booking.customer_address} />
              </InfoCard>

              <InfoCard icon={<IconFile size={18} />} title="Booking">
                <InfoRow label="Booking No" value={booking.booking_no} />
                <InfoRow label="Status"     value={booking.booking_status} />
                <InfoRow label="Source"     value={booking.booking_source} />
                <InfoRow
                  label="Booked At"
                  value={fmtDateTime(booking.booked_at || booking.created_at)}
                />
              </InfoCard>

              <InfoCard icon={<IconShield size={18} />} title="Event">
                <InfoRow label="Title"   value={booking.event_title} />
                <InfoRow label="Type"    value={booking.event_type} />
                <InfoRow label="Guests"  value={booking.guest_count} />
                <InfoRow label="Details" value={booking.event_details} />
              </InfoCard>

              <InfoCard icon={<IconCalendar size={18} />} title="Slot">
                <InfoRow label="Date"  value={booking.slot_date} />
                <InfoRow label="Hall"  value={booking.hall_name} />
                <InfoRow label="Shift" value={booking.shift_name} />
                <InfoRow
                  label="Time"
                  value={
                    booking.start_time && booking.end_time
                      ? `${booking.start_time} – ${booking.end_time}`
                      : null
                  }
                />
              </InfoCard>
            </div>

            {/* ══ MAIN PAYMENT ══ */}
            <SectionDivider icon={<IconCreditCard size={18} />} title="Main Payment" />

            <div className="payment-card-wrap">
              <div className="payment-card">
                <div className="payment-card-icon-wrap">
                  <IconBuilding size={22} />
                </div>
                <div className="payment-info">
                  <p className="payment-desc">Main Hall Booking Payment</p>
                  <div className="payment-meta">
                    <span className="meta-tag">{booking.payment_method || "—"}</span>
                    <span className={`meta-tag ${booking.payment_status}`}>
                      {booking.payment_status || booking.booking_status || "—"}
                    </span>
                  </div>
                </div>
                <div className="payment-amount">{money(booking.total_amount)}</div>
              </div>
            </div>

            {/* ══ EXTRA CHARGES ══ */}
{/* ══ EXTRA CHARGES ══ */}
<SectionDivider icon={<IconClipboard size={18} />} title="Extra Charges" />

{/* Saved charges table */}
<div className="charges-section">
  {charges.length === 0 && rows.length === 0 ? (
    <div className="no-charges">
      <span className="no-charges-icon"><IconClipboard size={36} /></span>
      <p>No extra charges added yet</p>
    </div>
  ) : charges.length > 0 ? (
    <div className="charges-table-wrap">
      <table className="charges-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th>Charge</th>
            <th>Method</th>
            <th>Status</th>
            <th>Notes</th>
            <th className="right">Amount</th>
            <th className="no-print center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge, idx) => (
            <tr
              key={charge.id}
              className={`charge-row${deletingId === charge.id ? " deleting" : ""}${updatingId === charge.id ? " updating" : ""}`}
            >
              <td className="row-num">{idx + 1}</td>
              <td className="charge-title">{charge.title}</td>
              <td>
                <span className="method-tag">
                  {charge.payment_method || "cash"}
                </span>
              </td>
              <td>
                <span className={`status-badge ${charge.payment_status}`}>
                  <span className="badge-dot" />
                  {charge.payment_status}
                </span>
              </td>
              <td className="notes-cell">{charge.notes || "—"}</td>
              <td className="right amount-cell">{money(charge.amount)}</td>
              <td className="no-print center">
                <div className="action-group">
                  {charge.payment_status === "due" ? (
                    <button
                      className="tbl-btn paid"
                      type="button"
                      disabled={updatingId === charge.id}
                      onClick={() => updateChargeStatus(charge, "paid")}
                      title="Mark as Paid"
                    >
                      <IconCheck size={13} />
                      {updatingId === charge.id ? "…" : "Mark Paid"}
                    </button>
                  ) : (
                    <button
                      className="tbl-btn due"
                      type="button"
                      disabled={updatingId === charge.id}
                      onClick={() => updateChargeStatus(charge, "due")}
                      title="Mark as Due"
                    >
                      <IconUndo size={13} />
                      {updatingId === charge.id ? "…" : "Mark Due"}
                    </button>
                  )}
                  <button
                    className="tbl-btn delete"
                    type="button"
                    disabled={deletingId === charge.id}
                    onClick={() => deleteCharge(charge)}
                    title="Delete charge"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null}
</div>

{/* ══ INLINE ROW FORMS — only for active bookings ══ */}
{["cancelled", "canceled", "rejected"].includes(
  String(booking.booking_status).toLowerCase()
) ? (
  <div className="blocked-notice no-print">
    <div className="blocked-notice-icon">
      <IconAlertCircle size={20} />
    </div>
    <div>
      <p className="blocked-notice-title">Extra charges are disabled</p>
      <p className="blocked-notice-desc">
        This booking is <strong>{booking.booking_status}</strong>. Extra charges cannot be added to cancelled or rejected bookings.
      </p>
    </div>
  </div>
) : (
  <div className="row-forms-area no-print">
    {rows.map((row, idx) => (
      <ChargeRowForm
        key={row._id}
        row={row}
        idx={idx}
        categories={categories}
        onChange={(field, value) => updateRow(row._id, field, value)}
        onSave={() => saveRow(row._id)}
        onRemove={() => removeRow(row._id)}
      />
    ))}

    <button className="add-row-btn" type="button" onClick={addRow}>
      <span className="add-row-circle">
        <IconPlus size={20} />
      </span>
      <span className="add-row-text">Add Extra Charge</span>
    </button>
  </div>
)}

            {/* ══ TOTALS ══ */}
            <SectionDivider icon={<IconBarChart size={18} />} title="Summary" />

            <div className="totals-panel">
              <div className="totals-grid">
                <TotalCard
                  label="Main Booking"
                  value={money(pageTotals.mainAmount)}
                  icon={<IconBuilding size={20} />}
                  variant="neutral"
                />
                <TotalCard
                  label="Extra Charges"
                  value={money(pageTotals.extraTotal)}
                  icon={<IconPlus size={20} />}
                  variant="neutral"
                />
                <TotalCard
                  label="Extra Paid"
                  value={money(pageTotals.extraPaid)}
                  icon={<IconCheck size={20} />}
                  variant="success"
                />
                <TotalCard
                  label="Extra Due"
                  value={money(pageTotals.extraDue)}
                  icon={<IconPin size={20} />}
                  variant="warning"
                />
              </div>

              <div className="grand-total-bar">
                <div className="grand-label">
                  <span className="grand-icon-wrap"><IconCreditCard size={22} /></span>
                  <span>Grand Invoice Total</span>
                </div>
                <span className="grand-value">{money(pageTotals.grandTotal)}</span>
              </div>
            </div>

            {/* ══ FOOTER ══ */}
            <div className="invoice-footer">
              <div className="footer-brand">
                <img
                  src="/assets/img/ECH-02.png"
                  alt="DLC"
                  className="footer-logo"
                />
                <p>Premium Convention & Party Venue in Dhaka</p>
              </div>
              <div className="footer-meta">
                <p>Generated by Elite Convention Hall Admin Panel</p>
                <p>Printed at: {new Date().toLocaleString()}</p>
              </div>
            </div>

          </div>
        )}
      </main>
    </>
  );
}

/* ─── CHARGE ROW FORM ─── */
function ChargeRowForm({ row, idx, categories, onChange, onSave, onRemove }) {
  const isNew = row.categoryId === "__new__";
  return (
    <div
      className={`charge-row-form${row.saved ? " saved" : ""}${row.saving ? " saving-state" : ""}`}
    >
      <div className="crf-header">
        <span className="crf-badge">New Charge #{idx + 1}</span>
        <button
          className="crf-remove-btn"
          type="button"
          onClick={onRemove}
          title="Remove this row"
        >
          <IconX size={15} />
        </button>
      </div>

      {row.error && (
        <div className="crf-error">
          <IconAlertCircle size={14} />
          {row.error}
        </div>
      )}

      <div className="crf-grid">
        <div className="crf-field">
          <label className="crf-label">
            <IconTag size={13} />
            Charge Type
          </label>
          <select
            value={row.categoryId}
            onChange={(e) => onChange("categoryId", e.target.value)}
            disabled={row.saving}
          >
            <option value="">Select charge type</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="__new__">+ Add New Charge Type</option>
          </select>
        </div>

        {isNew && (
          <div className="crf-field slide-in">
            <label className="crf-label">
              <IconEdit size={13} />
              New Charge Name
            </label>
            <input
              type="text"
              value={row.newCategoryName}
              onChange={(e) => onChange("newCategoryName", e.target.value)}
              placeholder="e.g. Sound System Charge"
              disabled={row.saving}
            />
          </div>
        )}

        <div className="crf-field">
          <label className="crf-label">
            <IconTaka size={13} />
            Amount
          </label>
          <input
            type="number"
            min="1"
            value={row.amount}
            onChange={(e) => onChange("amount", e.target.value)}
            placeholder="Enter amount"
            disabled={row.saving}
          />
        </div>

        <div className="crf-field">
          <label className="crf-label">
            <IconPin size={13} />
            Status
          </label>
          <select
            value={row.paymentStatus}
            onChange={(e) => onChange("paymentStatus", e.target.value)}
            disabled={row.saving}
          >
            <option value="due">Due</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="crf-field crf-full">
          <label className="crf-label">
            <IconNote size={13} />
            Notes (Optional)
          </label>
          <input
            type="text"
            value={row.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="Add any additional notes…"
            disabled={row.saving}
          />
        </div>
      </div>

      <div className="crf-footer">
        <button
          className="crf-cancel-btn"
          type="button"
          onClick={onRemove}
          disabled={row.saving}
        >
          Discard
        </button>
        <button
          className="crf-save-btn"
          type="button"
          onClick={onSave}
          disabled={row.saving}
        >
          {row.saving ? (
            <>
              <span className="btn-spinner" />
              Saving…
            </>
          ) : row.saved ? (
            <>
              <IconCheck size={15} />
              Saved!
            </>
          ) : (
            <>
              <IconSave size={15} />
              Save Charge
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── SMALL HELPERS ─── */
function InfoCard({ icon, title, children }) {
  return (
    <div className="info-card">
      <div className="info-card-header">
        <div className="info-card-icon">{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="info-card-body">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || "—"}</span>
    </div>
  );
}

function SectionDivider({ icon, title }) {
  return (
    <div className="section-header">
      <div className="section-line" />
      <h2 className="section-title">
        <span className="section-icon">{icon}</span>
        {title}
      </h2>
      <div className="section-line" />
    </div>
  );
}

function TotalCard({ label, value, icon, variant }) {
  return (
    <div className={`total-card ${variant}`}>
      <div className="total-card-icon">{icon}</div>
      <div>
        <p className="total-card-label">{label}</p>
        <p className="total-card-value">{value}</p>
      </div>
    </div>
  );
}

/* ══════════════ STYLES ══════════════ */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #8f6908;
    --gold-light: #b8860b;
    --gold-pale: #f5edda;
    --gold-border: #ead7a6;
    --bg: #faf7f2;
    --surface: #ffffff;
    --text: #1a1a2e;
    --text-muted: #6b7280;
    --green: #198754;
    --green-bg: #e8f7ee;
    --amber: #8a5a00;
    --amber-bg: #fff3cd;
    --red: #dc3545;
    --red-bg: #fde8e8;
    --radius: 16px;
    --radius-sm: 10px;
    --shadow: 0 4px 24px rgba(0,0,0,0.07);
    --shadow-lg: 0 12px 48px rgba(0,0,0,0.11);
    --transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
  }

  body { background: var(--bg); }

  .page-wrapper {
    padding: 28px;
    font-family: 'Poppins', sans-serif;
    color: var(--text);
    max-width: 1280px;
    margin: 0 auto;
    animation: fadeInPage 0.45s ease;
  }

  @keyframes fadeInPage {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── TOP BAR ── */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 22px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .topbar-right { display: flex; gap: 10px; }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--gold);
    text-decoration: none;
    font-weight: 700;
    font-size: 14px;
    padding: 10px 18px;
    border-radius: var(--radius-sm);
    background: var(--gold-pale);
    border: 1px solid var(--gold-border);
    transition: var(--transition);
  }
  .back-btn:hover {
    background: var(--gold);
    color: white;
    transform: translateX(-3px);
    box-shadow: var(--shadow);
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    border-radius: var(--radius-sm);
    padding: 10px 18px;
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: var(--transition);
  }
  .action-btn.primary {
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: white;
    box-shadow: 0 4px 14px rgba(143,105,8,.32);
  }
  .action-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(143,105,8,.42);
  }
  .action-btn.secondary {
    background: var(--surface);
    color: var(--gold);
    border: 1.5px solid var(--gold-border);
  }
  .action-btn.secondary:hover {
    background: var(--gold-pale);
    transform: translateY(-2px);
  }

  /* ── ALERT ── */
  .alert-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 18px;
    border-radius: var(--radius);
    margin-bottom: 18px;
    font-weight: 600;
    font-size: 14px;
    animation: slideDown 0.3s ease;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .alert-banner.success {
    background: var(--green-bg);
    border: 1px solid #b7e8ce;
    color: #0a5c38;
  }
  .alert-banner.error {
    background: var(--red-bg);
    border: 1px solid #f5c6cb;
    color: #8b1a24;
  }
  .alert-icon { display: flex; align-items: center; flex-shrink: 0; }
  .alert-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    opacity: .6;
    color: inherit;
    transition: var(--transition);
  }
  .alert-close:hover { opacity: 1; transform: scale(1.2); }

  /* ── LOADING / EMPTY ── */
  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 80px 20px;
    background: var(--surface);
    border-radius: 24px;
    border: 1px solid var(--gold-border);
    text-align: center;
  }
  .spinner {
    width: 46px;
    height: 46px;
    border: 4px solid var(--gold-pale);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin .85s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-state p, .empty-state p { color: var(--text-muted); font-size: 15px; }
  .empty-icon-wrap { color: var(--gold); opacity: .5; }
  .empty-state h3 { font-size: 22px; }

  /* ══ INVOICE WRAPPER ══ */
  .invoice-wrapper {
    background: var(--surface);
    border-radius: 28px;
    border: 1px solid var(--gold-border);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  /* ══ HERO ══ */
  .invoice-hero {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 40px 40px 34px;
    background: linear-gradient(135deg, #fffdf8 0%, #fdf3d8 55%, #faf0c8 100%);
    border-bottom: 2px solid var(--gold-border);
    overflow: hidden;
    gap: 20px;
    flex-wrap: wrap;
  }
  .hero-bg-circle {
    position: absolute;
    top: -90px; right: -90px;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(184,134,11,.13) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1;
  }
  .hero-logo {
    width: 200px;
    max-width: 100%;
    transition: var(--transition);
  }
  .hero-logo:hover { transform: scale(1.03); }
  .hero-tagline { color: var(--text-muted); font-size: 13px; font-weight: 500; }
  .hero-right { z-index: 1; }

  /* ── STATUS PILL (fixed width) ── */
  .status-pill {
    display: inline-block;
    padding: 5px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
    letter-spacing: .4px;
    background: var(--gold-pale);
    color: var(--gold);
    border: 1px solid var(--gold-border);
    width: fit-content;
    align-self: flex-start;
  }
  .status-pill.confirmed {
    background: var(--green-bg);
    color: var(--green);
    border-color: #b7e8ce;
  }
  .status-pill.cancelled {
    background: var(--red-bg);
    color: var(--red);
    border-color: #f5c6cb;
  }
  .status-pill.pending {
    background: var(--amber-bg);
    color: var(--amber);
    border-color: #ffd97a;
  }

  .invoice-stamp {
    position: relative;
    overflow: hidden;
    text-align: right;
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: white;
    padding: 22px 28px;
    border-radius: 18px;
    box-shadow: 0 8px 28px rgba(143,105,8,.3);
    min-width: 200px;
  }
  .stamp-glow {
    position: absolute;
    top: -24px; right: -24px;
    width: 90px; height: 90px;
    border-radius: 50%;
    background: rgba(255,255,255,.14);
  }
  .stamp-label  { font-size: 11px; font-weight: 800; letter-spacing: 4px; opacity: .82; text-transform: uppercase; }
  .stamp-number { font-size: 22px; font-weight: 900; letter-spacing: 1px; margin: 6px 0 4px; }
  .stamp-date   { font-size: 12px; opacity: .78; font-weight: 500; }

  /* ══ INFO CARDS ══ */
  .info-cards-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-bottom: 1px solid var(--gold-border);
  }
  .info-card {
    padding: 24px;
    border-right: 1px solid var(--gold-border);
    transition: var(--transition);
    animation: cardFadeIn .45s ease both;
  }
  .info-card:last-child { border-right: none; }
  .info-card:hover { background: #fffdf8; }
  @keyframes cardFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .info-card:nth-child(1) { animation-delay: .08s; }
  .info-card:nth-child(2) { animation-delay: .16s; }
  .info-card:nth-child(3) { animation-delay: .24s; }
  .info-card:nth-child(4) { animation-delay: .32s; }

  .info-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--gold-border);
  }
  .info-card-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: white;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(143,105,8,.22);
  }
  .info-card-header h3 {
    font-size: 13px;
    font-weight: 800;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: .7px;
  }
  .info-card-body { display: flex; flex-direction: column; gap: 8px; }
  .info-row { display: flex; flex-direction: column; gap: 2px; }
  .info-label {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .4px;
  }
  .info-value { font-size: 13px; font-weight: 600; color: var(--text); word-break: break-word; }

  /* ══ SECTION DIVIDER ══ */
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 40px;
    margin: 30px 0 18px;
  }
  .section-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--gold-border), transparent);
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 800;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 1.4px;
    white-space: nowrap;
  }
  .section-icon { display: flex; align-items: center; }

  /* ══ MAIN PAYMENT CARD ══ */
  .payment-card-wrap {
    margin: 0 40px 28px;
    animation: cardFadeIn .5s ease .4s both;
  }
  .payment-card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 22px 28px;
    border-radius: 18px;
    background: linear-gradient(135deg, #fffdf8, var(--gold-pale));
    border: 1px solid var(--gold-border);
    box-shadow: var(--shadow);
    transition: var(--transition);
    flex-wrap: wrap;
  }
  .payment-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(143,105,8,.14);
  }
  .payment-card-icon-wrap {
    width: 48px; height: 48px;
    border-radius: 14px;
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: white;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(143,105,8,.3);
  }
  .payment-info { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .payment-desc { font-size: 15px; font-weight: 700; color: var(--text); }
  .payment-meta { display: flex; gap: 8px; flex-wrap: wrap; }
  .meta-tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: capitalize;
    background: white;
    border: 1px solid var(--gold-border);
    color: var(--gold);
  }
  .meta-tag.paid { background: var(--green-bg); color: var(--green); border-color: #b7e8ce; }
  .meta-tag.due  { background: var(--amber-bg); color: var(--amber); border-color: #ffd97a; }
  .payment-amount {
    font-size: 30px;
    font-weight: 900;
    color: var(--gold);
    letter-spacing: -.5px;
    white-space: nowrap;
  }

  /* ══ CHARGES TABLE ══ */
  .charges-section { margin: 0 40px 8px; }
  .no-charges {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px;
    background: #fafafa;
    border-radius: 18px;
    border: 2px dashed var(--gold-border);
    color: var(--text-muted);
  }
  .no-charges-icon { color: var(--gold); opacity: .45; }
  .charges-table-wrap {
    border-radius: 18px;
    border: 1px solid var(--gold-border);
    overflow: hidden;
    box-shadow: var(--shadow);
    animation: cardFadeIn .45s ease;
  }
  .charges-table { width: 100%; border-collapse: collapse; }
  .charges-table thead {
    background: linear-gradient(135deg, #fffdf8, var(--gold-pale));
  }
  .charges-table th {
    padding: 13px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: .8px;
    border-bottom: 2px solid var(--gold-border);
  }
  .charges-table td {
    padding: 13px 16px;
    font-size: 13.5px;
    border-bottom: 1px solid #f5f0e8;
    vertical-align: middle;
  }
  .charge-row { transition: var(--transition); animation: rowFadeIn .35s ease both; }
  @keyframes rowFadeIn {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .charge-row:hover { background: #fffdf8; }
  .charge-row:last-child td { border-bottom: none; }
  .charge-row.deleting { opacity: .45; pointer-events: none; }
  .charge-row.updating { opacity: .65; }

  .row-num { font-size: 12px; font-weight: 700; color: var(--text-muted); width: 36px; }
  .charge-title { font-weight: 700; }
  .method-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: capitalize;
    background: var(--gold-pale);
    color: var(--gold);
    border: 1px solid var(--gold-border);
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: capitalize;
  }
  .status-badge.paid { background: var(--green-bg); color: var(--green); }
  .status-badge.due  { background: var(--amber-bg); color: var(--amber); }
  .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .notes-cell { font-size: 12.5px; color: var(--text-muted); max-width: 200px; }
  .amount-cell { font-weight: 800; font-size: 14px; color: var(--gold); white-space: nowrap; }
  .right  { text-align: right !important; }
  .center { text-align: center !important; }

  .action-group { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
  .tbl-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: none;
    border-radius: 8px;
    font-family: 'Poppins', sans-serif;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
  }
  .tbl-btn:disabled { opacity: .55; cursor: not-allowed; }
  .tbl-btn.paid  { background: var(--green-bg); color: var(--green); border: 1px solid #b7e8ce; }
  .tbl-btn.paid:hover:not(:disabled)  { background: var(--green); color: white; transform: scale(1.05); }
  .tbl-btn.due   { background: var(--amber-bg); color: var(--amber); border: 1px solid #ffd97a; }
  .tbl-btn.due:hover:not(:disabled)   { background: var(--amber); color: white; transform: scale(1.05); }
  .tbl-btn.delete { background: var(--red-bg); color: var(--red); border: 1px solid #f5c6cb; padding: 6px 10px; }
  .tbl-btn.delete:hover:not(:disabled) { background: var(--red); color: white; transform: scale(1.08); }

  /* ══ ROW FORMS AREA ══ */
  .row-forms-area {
    margin: 16px 40px 10px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── SINGLE CHARGE ROW FORM ── */
  .charge-row-form {
    border: 1.5px solid var(--gold-border);
    border-radius: 18px;
    background: linear-gradient(135deg, #fffdf8, #fdf8ec);
    padding: 22px 24px 18px;
    box-shadow: var(--shadow);
    transition: var(--transition);
    animation: formSlideIn .35s cubic-bezier(.4,0,.2,1) both;
    position: relative;
    overflow: hidden;
  }
  .charge-row-form::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, var(--gold), var(--gold-light));
    border-radius: 18px 0 0 18px;
  }
  @keyframes formSlideIn {
    from { opacity: 0; transform: translateY(14px) scale(.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .charge-row-form:hover { box-shadow: 0 8px 30px rgba(143,105,8,.13); }
  .charge-row-form.saved {
    border-color: #b7e8ce;
    background: linear-gradient(135deg, #f4fdf7, #e8f7ee);
  }
  .charge-row-form.saved::before {
    background: linear-gradient(180deg, var(--green), #22c55e);
  }

  .crf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .crf-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: white;
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: .4px;
  }
  .crf-remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    background: var(--red-bg);
    border: 1px solid #f5c6cb;
    color: var(--red);
    cursor: pointer;
    transition: var(--transition);
  }
  .crf-remove-btn:hover { background: var(--red); color: white; transform: scale(1.1); }

  .crf-error {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 13px;
    border-radius: 10px;
    margin-bottom: 14px;
    background: var(--red-bg);
    border: 1px solid #f5c6cb;
    color: #8b1a24;
    font-size: 13px;
    font-weight: 600;
    animation: slideDown .25s ease;
  }

  .crf-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .crf-full { grid-column: 1 / -1; }
  .crf-field { display: flex; flex-direction: column; gap: 6px; }

  .crf-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: .5px;
  }

  .crf-grid input,
  .crf-grid select {
    width: 100%;
    border: 1.5px solid var(--gold-border);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: 'Poppins', sans-serif;
    font-size: 13px;
    color: var(--text);
    background: white;
    transition: var(--transition);
    outline: none;
  }
  .crf-grid input:focus,
  .crf-grid select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(143,105,8,.1);
    transform: translateY(-1px);
  }
  .crf-grid input:disabled,
  .crf-grid select:disabled { opacity: .6; cursor: not-allowed; }

  .crf-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--gold-border);
  }
  .crf-cancel-btn {
    padding: 9px 20px;
    border: 1.5px solid var(--gold-border);
    border-radius: 10px;
    background: white;
    color: var(--text-muted);
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: var(--transition);
  }
  .crf-cancel-btn:hover:not(:disabled) { background: #f5f5f5; color: var(--text); }
  .crf-cancel-btn:disabled { opacity: .5; cursor: not-allowed; }

  .crf-save-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 22px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    color: white;
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    font-size: 13px;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: 0 4px 14px rgba(143,105,8,.28);
  }
  .crf-save-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(143,105,8,.38);
  }
  .crf-save-btn:disabled { opacity: .7; cursor: not-allowed; }

  .btn-spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,.38);
    border-top-color: white;
    border-radius: 50%;
    animation: spin .7s linear infinite;
    display: inline-block;
  }

  .slide-in { animation: slideIn .28s ease; }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* ── ADD ROW BUTTON ── */
  .add-row-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 16px 24px;
    background: white;
    border: 2px dashed var(--gold-border);
    border-radius: 18px;
    cursor: pointer;
    color: var(--gold);
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    font-weight: 700;
    transition: var(--transition);
    margin-top: 4px;
  }
  .add-row-btn:hover {
    border-color: var(--gold);
    background: var(--gold-pale);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }
  .add-row-btn:hover .add-row-circle {
    background: var(--gold);
    color: white;
    box-shadow: 0 4px 14px rgba(143,105,8,.35);
  }
  .add-row-circle {
    width: 36px; height: 36px;
    border-radius: 10px;
    flex-shrink: 0;
    background: var(--gold-pale);
    border: 1.5px solid var(--gold-border);
    color: var(--gold);
    display: flex; align-items: center; justify-content: center;
    transition: var(--transition);
  }
  .add-row-text { font-size: 14px; font-weight: 700; }

  /* ══ TOTALS PANEL ══ */
  .totals-panel { margin: 0 40px 32px; animation: cardFadeIn .55s ease .3s both; }
  .totals-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 14px;
  }
  .total-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    border-radius: 16px;
    border: 1px solid var(--gold-border);
    background: white;
    transition: var(--transition);
  }
  .total-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
  .total-card.success {
    background: linear-gradient(135deg, #f0fdf5, var(--green-bg));
    border-color: #b7e8ce;
  }
  .total-card.warning {
    background: linear-gradient(135deg, #fffdf0, var(--amber-bg));
    border-color: #ffd97a;
  }
  .total-card-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--gold-pale);
    color: var(--gold);
    border: 1px solid var(--gold-border);
  }
  .total-card.success .total-card-icon { background: var(--green-bg); color: var(--green); border-color: #b7e8ce; }
  .total-card.warning .total-card-icon { background: var(--amber-bg); color: var(--amber); border-color: #ffd97a; }
  .total-card-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 4px;
  }
  .total-card-value { font-size: 17px; font-weight: 900; color: var(--text); }
  .total-card.success .total-card-value { color: var(--green); }
  .total-card.warning .total-card-value { color: var(--amber); }

  .grand-total-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 22px 32px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--gold), var(--gold-light), #d4a017);
    color: white;
    box-shadow: 0 8px 28px rgba(143,105,8,.32);
    position: relative;
    overflow: hidden;
    transition: var(--transition);
  }
  .grand-total-bar::before {
    content: '';
    position: absolute;
    top: -45px; right: -45px;
    width: 140px; height: 140px;
    border-radius: 50%;
    background: rgba(255,255,255,.1);
  }
  .grand-total-bar::after {
    content: '';
    position: absolute;
    bottom: -35px; left: 60px;
    width: 100px; height: 100px;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }
  .grand-total-bar:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 40px rgba(143,105,8,.42);
  }
  .grand-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: .4px;
    z-index: 1;
  }
  .grand-icon-wrap { display: flex; align-items: center; }
  .grand-value { font-size: 28px; font-weight: 900; letter-spacing: -.4px; z-index: 1; }

  /* ══ FOOTER ══ */
  .invoice-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 22px 40px;
    border-top: 1px solid var(--gold-border);
    background: linear-gradient(135deg, #fffdf8, #fdf8ec);
    flex-wrap: wrap;
  }
  .footer-brand { display: flex; align-items: center; gap: 14px; }
  .footer-logo  { width: 96px; opacity: .8; }
  .footer-brand p, .footer-meta p { font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .footer-meta { text-align: right; }
/* ── BLOCKED NOTICE ── */
.blocked-notice {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 16px 40px 10px;
  padding: 16px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fdf2f2, var(--red-bg));
  border: 1.5px solid #f5c6cb;
  animation: cardFadeIn .4s ease;
}
.blocked-notice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--red-bg);
  border: 1px solid #f5c6cb;
  color: var(--red);
  flex-shrink: 0;
}
.blocked-notice-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--red);
  margin-bottom: 3px;
}
.blocked-notice-desc {
  font-size: 13px;
  color: #8b1a24;
  font-weight: 500;
  line-height: 1.5;
}
.blocked-notice-desc strong {
  font-weight: 800;
  text-transform: capitalize;
}
  /* ── RESPONSIVE ── */
  @media (max-width: 1100px) {
    .info-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .info-card:nth-child(2) { border-right: none; }
    .info-card:nth-child(3),
    .info-card:nth-child(4) { border-top: 1px solid var(--gold-border); }
    .info-card:nth-child(3) { border-right: 1px solid var(--gold-border); }
    .totals-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .crf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 768px) {
    .page-wrapper { padding: 14px; }
    .invoice-hero { padding: 22px; flex-direction: column; }
    .invoice-stamp { text-align: left; min-width: unset; }
    .info-cards-grid { grid-template-columns: 1fr; }
    .info-card { border-right: none; border-bottom: 1px solid var(--gold-border); }
    .info-card:last-child { border-bottom: none; }
    .section-header, .charges-section, .row-forms-area,
    .totals-panel, .payment-card-wrap { margin-left: 16px; margin-right: 16px; }
    .payment-amount { font-size: 24px; }
    .crf-grid { grid-template-columns: 1fr; }
    .grand-label { font-size: 13px; }
    .grand-value { font-size: 22px; }
    .invoice-footer { flex-direction: column; padding: 18px; }
    .footer-meta { text-align: left; }
  }

  @media (max-width: 500px) {
    .totals-grid { grid-template-columns: 1fr; }
    .topbar-right { width: 100%; }
    .action-btn { flex: 1; justify-content: center; }
  }

  /* ── PRINT ── */
  @media print {
    body { background: white !important; }
    .admin-sidebar, .admin-mobile-topbar, .sidebar-backdrop, .no-print {
      display: none !important;
    }
    .admin-main, .page-wrapper { margin-left: 0 !important; padding: 0 !important; }
    .invoice-wrapper {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }
    .charges-table td, .charges-table th { font-size: 11px; padding: 8px 10px; }
    .grand-total-bar, .invoice-stamp, .info-card-icon, .total-card {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;