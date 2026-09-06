import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, customerHeaders } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CUSTOMER_TOKEN_KEY = "dlc_customer_token_v1";
const CUSTOMER_USER_KEY = "dlc_customer_user_v1";

const emptyProfile = { name: "", email: "", phone: "", address: "" };
const emptyEditBooking = { id: "", event_title: "", event_type: "", event_details: "", guest_count: "" };

function getToken() { return localStorage.getItem(CUSTOMER_TOKEN_KEY); }
function money(v) { return `৳ ${Number(v || 0).toLocaleString()}`; }
function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}
function fmtDate(v) { return v || "—"; }
function getStatusClass(s) {
  const v = String(s || "default").toLowerCase();
  return ["confirmed", "pending", "rejected", "cancelled", "failed"].includes(v) ? v : "default";
}
function canEditBooking(row) {
  return String(row?.booking_status || "").toLowerCase() === "pending" &&
    String(row?.booking_source || "").toLowerCase() === "online";
}
function normalizeApiData(p) { return p?.data !== undefined ? p.data : p; }
function getCustomerHeaders() {
  const token = getToken();
  let h = {};
  try { h = typeof customerHeaders === "function" ? customerHeaders(token) : {}; } catch { h = {}; }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(h || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
async function requestCustomerApi(path, options = {}) {
  const token = getToken();
  if (!token) { const e = new Error("Unauthorized"); e.status = 401; throw e; }
  if (typeof apiRequest === "function") {
    return apiRequest(path, { ...options, headers: { ...getCustomerHeaders(), ...(options.headers || {}) } });
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options, headers: { ...getCustomerHeaders(), ...(options.headers || {}) },
  });
  const result = await res.json().catch(() => ({}));
  if (res.status === 401) { const e = new Error("Unauthorized"); e.status = 401; throw e; }
  if (!res.ok) {
    const errors = result.errors ? Object.values(result.errors).flat().join("\n") : "";
    throw new Error(errors || result.message || "Request failed.");
  }
  return result;
}

/* ── ICONS ── */
function IUser({ s = 18 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IMail({ s = 18 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function IPhone({ s = 18 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>;
}
function IMapPin({ s = 18 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function ISave({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
}
function ILogOut({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function IHome({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function ICalendar({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IShield({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function ICreditCard({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IEdit({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IX({ s = 18 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function ICheck({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>;
}
function IActivity({ s = 20 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function IChevronDown({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function IChevronUp({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
}
function IInfo({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function IClock({ s = 14 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IUsers({ s = 14 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IBuilding({ s = 14 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 21V9"/></svg>;
}
function IDollar({ s = 14 }) {
  return <span style={{ fontSize: s, fontWeight: 800, fontFamily: "inherit", lineHeight: 1, display: "inline-flex", alignItems: "center" }}>৳</span>;
}

/* ─────────────────────────────────────────── */

export default function CustomerPanelPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(emptyProfile);
  const [bookings, setBookings] = useState([]);
  const [isLoadingPanel, setIsLoadingPanel] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessageState] = useState({ text: "", type: "success", show: false });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBookingForm, setEditBookingForm] = useState(emptyEditBooking);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");

  const profileInitial = useMemo(() => (profile.name || "U").charAt(0).toUpperCase(), [profile.name]);

  const showMessage = useCallback((text, type = "success") => {
    setMessageState({ text, type, show: true });
    window.clearTimeout(showMessage.hideTimer);
    showMessage.hideTimer = window.setTimeout(() => {
      setMessageState({ text: "", type: "success", show: false });
    }, 4500);
  }, []);

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_USER_KEY);
    navigate("/login?redirect=customer-panel");
  }, [navigate]);

  const handleRequestError = useCallback((error, fallback) => {
    if (error?.status === 401 || String(error?.message || "").toLowerCase().includes("unauthorized")) {
      redirectToLogin(); return;
    }
    showMessage(error.message || fallback, "error");
  }, [redirectToLogin, showMessage]);

  const loadPanel = useCallback(async () => {
    setIsLoadingPanel(true);
    try {
      const result = await requestCustomerApi("/auth/panel", { method: "GET" });
      const data = normalizeApiData(result) || {};
      const np = data.profile || data.user || data.customer || {};
      const nb = data.bookings || [];
      setProfile({ name: np.name || "", email: np.email || "", phone: np.phone || "", address: np.address || "" });
      setBookings(Array.isArray(nb) ? nb : []);
      localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify({ name: np.name || "", email: np.email || "", phone: np.phone || "", address: np.address || "" }));
    } catch (error) {
      handleRequestError(error, "Unable to load customer panel.");
    } finally {
      setIsLoadingPanel(false);
    }
  }, [handleRequestError]);

  const updateProfileField = useCallback((field, value) => {
    setProfile((c) => ({ ...c, [field]: value }));
  }, []);

  const updateEditBookingField = useCallback((field, value) => {
    setEditBookingForm((c) => ({ ...c, [field]: value }));
  }, []);

  const updateProfile = useCallback(async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const result = await requestCustomerApi("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: profile.name.trim(), email: profile.email.trim(), phone: profile.phone.trim(), address: profile.address.trim() }),
      });
      showMessage(result.message || "Profile updated successfully.", "success");
      await loadPanel();
    } catch (error) {
      handleRequestError(error, "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }, [handleRequestError, loadPanel, profile, showMessage]);

  const openEditModal = useCallback((bookingId) => {
    const row = bookings.find((item) => Number(item.id) === Number(bookingId));
    if (!row) { showMessage("Booking not found.", "error"); return; }
    setEditBookingForm({ id: row.id || "", event_title: row.event_title || "", event_type: row.event_type || "", event_details: row.event_details || "", guest_count: row.guest_count || "" });
    setEditModalOpen(true);
  }, [bookings, showMessage]);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditBookingForm(emptyEditBooking);
  }, []);

  const updateBooking = useCallback(async (e) => {
    e.preventDefault();
    if (!editBookingForm.id) { showMessage("Booking not found.", "error"); return; }
    setIsUpdatingBooking(true);
    try {
      const result = await requestCustomerApi(`/auth/bookings/${editBookingForm.id}`, {
        method: "PATCH",
        body: JSON.stringify({ event_title: editBookingForm.event_title.trim(), event_type: editBookingForm.event_type.trim(), event_details: editBookingForm.event_details.trim(), guest_count: Number(editBookingForm.guest_count) }),
      });
      closeEditModal();
      showMessage(result.message || "Booking updated successfully.", "success");
      await loadPanel();
    } catch (error) {
      handleRequestError(error, "Unable to update booking.");
    } finally {
      setIsUpdatingBooking(false);
    }
  }, [closeEditModal, editBookingForm, handleRequestError, loadPanel, showMessage]);

  const logoutCustomer = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await requestCustomerApi("/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } catch { /* ignore */ } finally {
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_USER_KEY);
      setIsLoggingOut(false);
      navigate("/login");
    }
  }, [isLoggingOut, navigate]);

  const toggleBooking = useCallback((id) => {
    setExpandedBooking((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (!getToken()) { redirectToLogin(); return; }
    loadPanel();
  }, [loadPanel, redirectToLogin]);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") closeEditModal(); };
    document.addEventListener("keydown", handleEscape);
    return () => { document.removeEventListener("keydown", handleEscape); window.clearTimeout(showMessage.hideTimer); };
  }, [closeEditModal]);

  return (
    <>
      <style>{styles}</style>

      {/* ── TOPBAR ── */}
      <header className="cp-topbar">
        <div className="cp-topbar-inner">
          <Link to="/" className="cp-logo">
            <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
          </Link>
          <div className="cp-nav-actions">
            <Link className="cp-btn cp-btn-outline" to="/">
              <IHome s={15} /> Home
            </Link>
            <button className="cp-btn cp-btn-danger" type="button" onClick={logoutCustomer} disabled={isLoggingOut}>
              <ILogOut s={15} />
              {isLoggingOut ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className="cp-main">

        {/* ── HERO BANNER ── */}
        <div className="cp-hero">
          <div className="cp-hero-inner">
            <div className="cp-hero-avatar">{profileInitial}</div>
            <div className="cp-hero-text">
              <h1>{profile.name || "Welcome"}</h1>
              <p>{profile.email || "Customer Panel"}</p>
            </div>
            <div className="cp-hero-stats">
              <div className="cp-stat">
                <span className="cp-stat-num">{bookings.length}</span>
                <span className="cp-stat-label">Total Bookings</span>
              </div>
              <div className="cp-stat-divider" />
              <div className="cp-stat">
                <span className="cp-stat-num">
                  {bookings.filter((b) => String(b.booking_status).toLowerCase() === "confirmed").length}
                </span>
                <span className="cp-stat-label">Confirmed</span>
              </div>
              <div className="cp-stat-divider" />
              <div className="cp-stat">
                <span className="cp-stat-num">
                  {bookings.filter((b) => String(b.booking_status).toLowerCase() === "pending").length}
                </span>
                <span className="cp-stat-label">Pending</span>
              </div>
            </div>
          </div>
          <div className="cp-hero-blob" />
          <div className="cp-hero-blob2" />
        </div>

        <div className="cp-container">

          {/* ── ALERT MESSAGE ── */}
          {message.show && (
            <div className={`cp-alert cp-alert-${message.type}`}>
              <span className="cp-alert-icon">
                {message.type === "success" ? <ICheck s={18} /> : <IInfo s={18} />}
              </span>
              <span>{message.text}</span>
              <button className="cp-alert-close" onClick={() => setMessageState({ text: "", type: "success", show: false })}>
                <IX s={14} />
              </button>
            </div>
          )}

          {/* ── TAB NAV ── */}
          <div className="cp-tabs">
            <button
              className={`cp-tab ${activeSection === "profile" ? "active" : ""}`}
              onClick={() => setActiveSection("profile")}
            >
              <IUser s={16} /> Profile
            </button>
            <button
              className={`cp-tab ${activeSection === "bookings" ? "active" : ""}`}
              onClick={() => setActiveSection("bookings")}
            >
              <IActivity s={16} /> My Bookings
              {bookings.length > 0 && (
                <span className="cp-tab-badge">{bookings.length}</span>
              )}
            </button>
          </div>

          {/* ══ PROFILE TAB ══ */}
          {activeSection === "profile" && (
            <div className="cp-profile-panel">
              <div className="cp-profile-grid">

                {/* Left – Info Display */}
                <div className="cp-profile-info-card">
                  <div className="cp-pcard-header">
                    <div className="cp-pcard-icon"><IUser s={20} /></div>
                    <div>
                      <h3>Account Overview</h3>
                      <p>Your registered details</p>
                    </div>
                  </div>
                  <div className="cp-pcard-body">
                    <ProfileInfoItem icon={<IUser s={16} />} label="Full Name" value={profile.name} />
                    <ProfileInfoItem icon={<IMail s={16} />} label="Email Address" value={profile.email} />
                    <ProfileInfoItem icon={<IPhone s={16} />} label="Phone Number" value={profile.phone} />
                    <ProfileInfoItem icon={<IMapPin s={16} />} label="Address" value={profile.address} />
                  </div>
                </div>

                {/* Right – Edit Form */}
                <div className="cp-profile-form-card">
                  <div className="cp-pcard-header">
                    <div className="cp-pcard-icon"><IEdit s={20} /></div>
                    <div>
                      <h3>Edit Profile</h3>
                      <p>Update your personal information</p>
                    </div>
                  </div>
                  <div className="cp-pcard-body">
                    <form onSubmit={updateProfile} className="cp-form">
                      <CpField label="Full Name" icon={<IUser s={15} />} id="pName">
                        <input
                          id="pName" type="text" required value={profile.name}
                          placeholder="Your full name"
                          onChange={(e) => updateProfileField("name", e.target.value)}
                        />
                      </CpField>
                      <CpField label="Email Address" icon={<IMail s={15} />} id="pEmail">
                        <input
                          id="pEmail" type="email" required value={profile.email}
                          placeholder="your@email.com"
                          onChange={(e) => updateProfileField("email", e.target.value)}
                        />
                      </CpField>
                      <CpField label="Phone Number" icon={<IPhone s={15} />} id="pPhone">
                        <input
                          id="pPhone" type="text" required value={profile.phone}
                          placeholder="+880 ..."
                          onChange={(e) => updateProfileField("phone", e.target.value)}
                        />
                      </CpField>
                      <CpField label="Address" icon={<IMapPin s={15} />} id="pAddress">
                        <textarea
                          id="pAddress" value={profile.address}
                          placeholder="Your full address"
                          onChange={(e) => updateProfileField("address", e.target.value)}
                        />
                      </CpField>
                      <button className="cp-btn cp-btn-primary cp-btn-full" type="submit" disabled={isSavingProfile}>
                        {isSavingProfile ? (
                          <><span className="cp-spinner" /> Saving…</>
                        ) : (
                          <><ISave s={16} /> Save Profile</>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══ BOOKINGS TAB ══ */}
          {activeSection === "bookings" && (
            <div className="cp-bookings-panel">
              {isLoadingPanel ? (
                <div className="cp-loading">
                  <div className="cp-loading-spinner" />
                  <p>Loading your bookings…</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="cp-empty">
                  <div className="cp-empty-icon"><IActivity s={40} /></div>
                  <h3>No Bookings Yet</h3>
                  <p>Your booking history will appear here once you make a reservation.</p>
                </div>
              ) : (
                <div className="cp-booking-list">
                  {bookings.map((row, idx) => (
                    <BookingCard
                      key={row.id || row.booking_no}
                      row={row}
                      idx={idx}
                      expanded={expandedBooking === (row.id || row.booking_no)}
                      onToggle={() => toggleBooking(row.id || row.booking_no)}
                      onEdit={() => openEditModal(row.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ══ EDIT MODAL ══ */}
      {editModalOpen && (
        <div
          className="cp-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}
        >
          <div className="cp-modal">
            <div className="cp-modal-header">
              <div className="cp-modal-title-wrap">
                <div className="cp-modal-icon"><IEdit s={20} /></div>
                <div>
                  <h3>Edit Booking</h3>
                  <p>Only pending online bookings can be edited</p>
                </div>
              </div>
              <button className="cp-modal-close" type="button" onClick={closeEditModal}>
                <IX s={18} />
              </button>
            </div>

            <form onSubmit={updateBooking} className="cp-form cp-modal-form">
              <input type="hidden" value={editBookingForm.id} readOnly />
              <div className="cp-form-row">
                <CpField label="Event Title" icon={<IShield s={15} />} id="eTitle">
                  <input
                    id="eTitle" type="text" required value={editBookingForm.event_title}
                    placeholder="Event title"
                    onChange={(e) => updateEditBookingField("event_title", e.target.value)}
                  />
                </CpField>
                <CpField label="Event Type" icon={<ICalendar s={15} />} id="eType">
                  <input
                    id="eType" type="text" required value={editBookingForm.event_type}
                    placeholder="e.g. Wedding, Birthday"
                    onChange={(e) => updateEditBookingField("event_type", e.target.value)}
                  />
                </CpField>
              </div>
              <CpField label="Event Details" icon={<IInfo s={15} />} id="eDetails">
                <textarea
                  id="eDetails" value={editBookingForm.event_details}
                  placeholder="Describe your event…"
                  onChange={(e) => updateEditBookingField("event_details", e.target.value)}
                />
              </CpField>
              <CpField label="Guest Count" icon={<IUsers s={15} />} id="eGuests">
                <input
                  id="eGuests" type="number" min="1" required value={editBookingForm.guest_count}
                  placeholder="Number of guests"
                  onChange={(e) => updateEditBookingField("guest_count", e.target.value)}
                />
              </CpField>
              <div className="cp-modal-footer">
                <button className="cp-btn cp-btn-outline" type="button" onClick={closeEditModal}>
                  Cancel
                </button>
                <button className="cp-btn cp-btn-primary" type="submit" disabled={isUpdatingBooking}>
                  {isUpdatingBooking ? (
                    <><span className="cp-spinner" /> Updating…</>
                  ) : (
                    <><ICheck s={16} /> Update Booking</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ── BOOKING CARD ── */
function BookingCard({ row, idx, expanded, onToggle, onEdit }) {
  const statusClass = getStatusClass(row.booking_status);
  const canEdit = canEditBooking(row);

  return (
    <div className={`cp-bcard cp-bcard-anim`} style={{ animationDelay: `${idx * 0.07}s` }}>
      {/* Card Header – always visible */}
      <button className="cp-bcard-header" type="button" onClick={onToggle}>
        <div className="cp-bcard-header-left">
          <div className={`cp-bcard-status-bar bg-${statusClass}`} />
          <div>
            <span className="cp-bcard-no">{row.booking_no || "—"}</span>
            <div className="cp-bcard-meta">
              <span className="cp-bcard-event">{row.event_title || "Untitled Event"}</span>
              <span className="cp-bcard-dot">·</span>
              <span className="cp-bcard-date">
                <ICalendar s={12} /> {row.slot_date || "—"}
              </span>
              <span className="cp-bcard-dot">·</span>
              <span className="cp-bcard-hall">
                <IBuilding s={12} /> {row.hall_name || "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="cp-bcard-header-right">
          <span className={`cp-badge cp-badge-${statusClass}`}>{row.booking_status || "—"}</span>
          <span className="cp-bcard-amount">{money(row.total_amount)}</span>
          <span className="cp-bcard-chevron">
            {expanded ? <IChevronUp s={18} /> : <IChevronDown s={18} />}
          </span>
        </div>
      </button>

      {/* Expandable body */}
      <div className={`cp-bcard-body ${expanded ? "open" : ""}`}>
        <div className="cp-bcard-body-inner">

          {/* Event Info */}
          <SectionLabel icon={<IShield s={14} />} title="Event Information" />
          <div className="cp-binfo-grid">
            <InfoChip label="Event Title"   value={row.event_title} />
            <InfoChip label="Event Type"    value={row.event_type} />
            <InfoChip label="Guest Count"   value={row.guest_count} icon={<IUsers s={13} />} />
            <InfoChip label="Booked At"     value={fmtDateTime(row.booked_at || row.created_at)} icon={<IClock s={13} />} />
            <InfoChip label="Event Details" value={row.event_details} full />
          </div>

          {/* Slot Info */}
          <SectionLabel icon={<ICalendar s={14} />} title="Slot Information" />
          <div className="cp-binfo-grid">
            <InfoChip label="Selected Date" value={fmtDate(row.slot_date)}  icon={<ICalendar s={13} />} />
            <InfoChip label="Hall"          value={row.hall_name}           icon={<IBuilding s={13} />} />
            <InfoChip label="Shift"         value={row.shift_name} />
            <InfoChip label="Time"          value={row.start_time && row.end_time ? `${row.start_time} – ${row.end_time}` : row.start_time || "—"} icon={<IClock s={13} />} />
            <InfoChip label="Slot Status"   value={row.slot_status} />
            <InfoChip label="Total Amount"  value={money(row.total_amount)} icon={<IDollar s={13} />} highlight />
          </div>

          {/* Payment Info */}
          <SectionLabel icon={<ICreditCard s={14} />} title="Payment Information" />
          <div className="cp-binfo-grid">
            <InfoChip label="Cardholder"     value={row.cardholder_name} />
            <InfoChip label="Card"           value={row.card_last_four ? `•••• ${row.card_last_four}` : "—"} />
            <InfoChip label="Billing Addr"   value={row.billing_address} />
            <InfoChip label="Method"         value={row.payment_method} />
            <InfoChip label="Pay Status"     value={row.payment_status} />
            <InfoChip label="Paid Amount"    value={money(row.amount)} icon={<IDollar s={13} />} highlight />
            <InfoChip label="Transaction Ref" value={row.transaction_reference} full />
            <InfoChip label="Paid At"        value={fmtDateTime(row.paid_at)} icon={<IClock s={13} />} />
          </div>

          {/* Edit button */}
          <div className="cp-bcard-actions">
            {canEdit ? (
              <button className="cp-btn cp-btn-edit" type="button" onClick={onEdit}>
                <IEdit s={15} /> Edit Pending Booking
              </button>
            ) : (
              <p className="cp-edit-note">
                <IInfo s={14} />
                Booking editing is available only for pending online bookings.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── SMALL HELPERS ── */
function ProfileInfoItem({ icon, label, value }) {
  return (
    <div className="cp-profile-info-item">
      <div className="cp-pii-icon">{icon}</div>
      <div>
        <span className="cp-pii-label">{label}</span>
        <span className="cp-pii-value">{value || "—"}</span>
      </div>
    </div>
  );
}

function CpField({ label, icon, id, children }) {
  return (
    <div className="cp-field">
      <label htmlFor={id} className="cp-field-label">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ icon, title }) {
  return (
    <div className="cp-section-label">
      <span className="cp-section-icon">{icon}</span>
      <span>{title}</span>
      <span className="cp-section-line" />
    </div>
  );
}

function InfoChip({ label, value, icon, full, highlight }) {
  return (
    <div className={`cp-chip ${full ? "cp-chip-full" : ""} ${highlight ? "cp-chip-highlight" : ""}`}>
      <span className="cp-chip-label">{label}</span>
      <span className="cp-chip-value">
        {icon && <span className="cp-chip-icon">{icon}</span>}
        {value || "—"}
      </span>
    </div>
  );
}

/* ══════════════ STYLES ══════════════ */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #b8860b;
    --gold-dark: #8f6908;
    --gold-light: #d4a017;
    --gold-pale: #fdf6e3;
    --gold-border: #ead7a6;
    --bg: #faf7f2;
    --white: #ffffff;
    --text: #1a1a2e;
    --muted: #6b7280;
    --green: #198754;
    --green-bg: #e8f7ee;
    --red: #dc3545;
    --red-bg: #fde8e8;
    --amber: #8a5a00;
    --amber-bg: #fff3cd;
    --blue: #0d6efd;
    --shadow: 0 4px 24px rgba(0,0,0,0.07);
    --shadow-lg: 0 12px 48px rgba(0,0,0,0.11);
    --radius: 20px;
    --radius-sm: 12px;
    --transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
  }

  body { font-family: 'Poppins', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
  a { color: inherit; text-decoration: none; }

  /* ── TOPBAR ── */
  .cp-topbar {
    background: rgba(255,255,255,0.96);
    border-bottom: 1px solid var(--gold-border);
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 4px 22px rgba(0,0,0,0.05);
    backdrop-filter: blur(10px);
  }
  .cp-topbar-inner {
    width: 92%; max-width: 1280px; margin: auto;
    height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .cp-logo img { height: 36px; display: block; transition: var(--transition); }
  .cp-logo img:hover { transform: scale(1.04); }
  .cp-nav-actions { display: flex; align-items: center; gap: 10px; }

  /* ── BUTTONS ── */
  .cp-btn {
    display: inline-flex; align-items: center; gap: 7px;
    border: none; border-radius: 999px;
    padding: 10px 20px; font-family: 'Poppins', sans-serif;
    font-weight: 700; font-size: 13px; cursor: pointer;
    transition: var(--transition);
  }
  .cp-btn-primary {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white; box-shadow: 0 4px 14px rgba(143,105,8,.3);
  }
  .cp-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(143,105,8,.4); }
  .cp-btn-outline {
    background: white; color: var(--gold-dark);
    border: 1.5px solid var(--gold-border);
  }
  .cp-btn-outline:hover:not(:disabled) { background: var(--gold-pale); transform: translateY(-2px); }
  .cp-btn-danger {
    background: linear-gradient(135deg, #9c1a1a, var(--red));
    color: white; box-shadow: 0 4px 14px rgba(220,53,69,.28);
  }
  .cp-btn-danger:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(220,53,69,.38); }
  .cp-btn-edit {
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    color: white; border-radius: var(--radius-sm);
    box-shadow: 0 4px 14px rgba(143,105,8,.28);
    padding: 10px 20px;
  }
  .cp-btn-edit:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(143,105,8,.38); }
  .cp-btn-full { width: 100%; justify-content: center; border-radius: var(--radius-sm); }
  .cp-btn:disabled { opacity: .65; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

  /* ── SPINNER ── */
  .cp-spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,.35); border-top-color: white;
    border-radius: 50%; animation: cpSpin .7s linear infinite; display: inline-block;
  }
  @keyframes cpSpin { to { transform: rotate(360deg); } }

  /* ── HERO ── */
  .cp-hero {
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, #1a1a2e 0%, #2d2060 50%, #1a1a2e 100%);
    padding: 48px 0;
    margin-bottom: 0;
  }
  .cp-hero-inner {
    width: 92%; max-width: 1280px; margin: auto;
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
    position: relative; z-index: 1;
  }
  .cp-hero-avatar {
    width: 80px; height: 80px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold-light));
    color: white; display: flex; align-items: center; justify-content: center;
    font-size: 32px; font-weight: 900; flex-shrink: 0;
    box-shadow: 0 8px 28px rgba(184,134,11,.4);
    border: 3px solid rgba(255,255,255,.2);
    animation: heroPop .6s cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes heroPop {
    from { transform: scale(0.7); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  .cp-hero-text { flex: 1; animation: heroSlide .55s ease .1s both; }
  @keyframes heroSlide {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .cp-hero-text h1 { font-size: 28px; font-weight: 900; color: white; margin-bottom: 4px; }
  .cp-hero-text p  { color: rgba(255,255,255,.6); font-size: 14px; }
  .cp-hero-stats {
    display: flex; align-items: center; gap: 0;
    background: rgba(255,255,255,.1); backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 18px; overflow: hidden;
    animation: heroSlide .55s ease .2s both;
  }
  .cp-stat {
    display: flex; flex-direction: column; align-items: center;
    gap: 2px; padding: 18px 28px;
  }
  .cp-stat-num   { font-size: 26px; font-weight: 900; color: var(--gold-light); }
  .cp-stat-label { font-size: 11px; color: rgba(255,255,255,.6); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
  .cp-stat-divider { width: 1px; height: 50px; background: rgba(255,255,255,.15); }
  .cp-hero-blob {
    position: absolute; top: -80px; right: -80px;
    width: 340px; height: 340px; border-radius: 50%;
    background: radial-gradient(circle, rgba(184,134,11,.22) 0%, transparent 70%);
    pointer-events: none;
  }
  .cp-hero-blob2 {
    position: absolute; bottom: -60px; left: 10%;
    width: 200px; height: 200px; border-radius: 50%;
    background: radial-gradient(circle, rgba(184,134,11,.12) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── CONTAINER ── */
  .cp-main { min-height: calc(100vh - 70px); }
  .cp-container {
    width: 92%; max-width: 1280px; margin: auto; padding: 32px 0 70px;
  }

  /* ── ALERT ── */
  .cp-alert {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px; border-radius: var(--radius-sm);
    margin-bottom: 22px; font-size: 14px; font-weight: 600;
    animation: alertIn .3s ease;
  }
  @keyframes alertIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cp-alert-success { background: var(--green-bg); border: 1px solid #b7e8ce; color: #0a5c38; }
  .cp-alert-error   { background: var(--red-bg);   border: 1px solid #f5c6cb; color: #8b1a24; }
  .cp-alert-icon    { display: flex; align-items: center; flex-shrink: 0; }
  .cp-alert-close   { margin-left: auto; background: none; border: none; cursor: pointer; opacity: .6; color: inherit; display: flex; align-items: center; transition: var(--transition); }
  .cp-alert-close:hover { opacity: 1; transform: scale(1.2); }

  /* ── TABS ── */
  .cp-tabs {
    display: flex; gap: 6px;
    background: white; border: 1px solid var(--gold-border);
    border-radius: 999px; padding: 5px;
    margin-bottom: 28px; width: fit-content;
    box-shadow: var(--shadow);
    animation: fadeUp .4s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cp-tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 22px; border: none; border-radius: 999px;
    font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: var(--transition);
    color: var(--muted); background: transparent; position: relative;
  }
  .cp-tab:hover   { color: var(--gold-dark); background: var(--gold-pale); }
  .cp-tab.active  { background: linear-gradient(135deg,var(--gold-dark),var(--gold)); color: white; box-shadow: 0 4px 14px rgba(143,105,8,.3); }
  .cp-tab-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(255,255,255,.3); font-size: 11px; font-weight: 800;
  }
  .cp-tab.active .cp-tab-badge { background: rgba(255,255,255,.3); }
  .cp-tab:not(.active) .cp-tab-badge { background: var(--gold-pale); color: var(--gold-dark); }

  /* ══ PROFILE PANEL ══ */
  .cp-profile-panel { animation: fadeUp .4s ease both; }
  .cp-profile-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start;
  }
  .cp-pcard-header {
    display: flex; align-items: center; gap: 14px;
    padding: 22px 24px; border-bottom: 1px solid var(--gold-border);
    background: linear-gradient(135deg, var(--gold-pale), transparent);
  }
  .cp-pcard-icon {
    width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
    background: linear-gradient(135deg,var(--gold-dark),var(--gold));
    color: white; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(143,105,8,.28);
  }
  .cp-pcard-header h3 { font-size: 16px; font-weight: 800; color: var(--text); margin-bottom: 2px; }
  .cp-pcard-header p  { font-size: 12px; color: var(--muted); }
  .cp-pcard-body { padding: 24px; }

  .cp-profile-info-card,
  .cp-profile-form-card {
    background: white; border: 1px solid var(--gold-border);
    border-radius: var(--radius); box-shadow: var(--shadow);
    overflow: hidden; transition: var(--transition);
  }
  .cp-profile-info-card:hover,
  .cp-profile-form-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }

  .cp-profile-info-item {
    display: flex; align-items: flex-start; gap: 13px;
    padding: 14px 0; border-bottom: 1px solid #f5f0e8;
    transition: var(--transition);
  }
  .cp-profile-info-item:last-child { border-bottom: none; padding-bottom: 0; }
  .cp-profile-info-item:hover { transform: translateX(4px); }
  .cp-pii-icon {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: var(--gold-pale); color: var(--gold-dark);
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--gold-border);
  }
  .cp-pii-label {
    display: block; font-size: 10.5px; font-weight: 700;
    color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px;
  }
  .cp-pii-value { font-size: 14px; font-weight: 600; color: var(--text); word-break: break-word; }

  /* ── FORM ── */
  .cp-form { display: flex; flex-direction: column; gap: 14px; }
  .cp-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .cp-field { display: flex; flex-direction: column; gap: 6px; }
  .cp-field-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 700; color: var(--gold-dark);
    text-transform: uppercase; letter-spacing: .5px;
  }
  .cp-field input,
  .cp-field select,
  .cp-field textarea {
    width: 100%; border: 1.5px solid var(--gold-border); border-radius: var(--radius-sm);
    padding: 11px 14px; font-family: 'Poppins', sans-serif; font-size: 14px;
    color: var(--text); background: #fffdf9; outline: none; transition: var(--transition);
  }
  .cp-field input:focus,
  .cp-field textarea:focus {
    border-color: var(--gold); box-shadow: 0 0 0 3px rgba(184,134,11,.12);
    background: white; transform: translateY(-1px);
  }
  .cp-field textarea { resize: vertical; min-height: 90px; }

  /* ══ BOOKINGS PANEL ══ */
  .cp-bookings-panel { animation: fadeUp .4s ease both; }
  .cp-loading {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 70px 20px; background: white; border-radius: var(--radius);
    border: 1px solid var(--gold-border); text-align: center;
  }
  .cp-loading-spinner {
    width: 44px; height: 44px;
    border: 4px solid var(--gold-pale); border-top-color: var(--gold);
    border-radius: 50%; animation: cpSpin .85s linear infinite;
  }
  .cp-loading p { color: var(--muted); font-size: 15px; }
  .cp-empty {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 70px 20px; background: white; border-radius: var(--radius);
    border: 1px solid var(--gold-border); text-align: center;
  }
  .cp-empty-icon { color: var(--gold); opacity: .4; }
  .cp-empty h3   { font-size: 20px; color: var(--text); }
  .cp-empty p    { color: var(--muted); font-size: 14px; max-width: 360px; line-height: 1.7; }
  .cp-booking-list { display: flex; flex-direction: column; gap: 14px; }

  /* ── BOOKING CARD ── */
  .cp-bcard {
    background: white; border: 1px solid var(--gold-border);
    border-radius: 18px; overflow: hidden;
    box-shadow: var(--shadow); transition: var(--transition);
  }
  .cp-bcard:hover { box-shadow: 0 8px 32px rgba(0,0,0,.1); }
  .cp-bcard-anim {
    animation: bcardIn .4s ease both;
  }
  @keyframes bcardIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .cp-bcard-header {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 18px 20px; background: none; border: none; cursor: pointer;
    text-align: left; transition: var(--transition);
    background: linear-gradient(135deg, #fffdf8, var(--gold-pale));
  }
  .cp-bcard-header:hover { background: #fdf8ec; }
  .cp-bcard-header-left  { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
  .cp-bcard-header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

  .cp-bcard-status-bar {
    width: 5px; height: 48px; border-radius: 4px; flex-shrink: 0;
  }
  .bg-confirmed { background: var(--green); }
  .bg-pending   { background: #fd7e14; }
  .bg-rejected,
  .bg-cancelled,
  .bg-failed    { background: var(--red); }
  .bg-default   { background: #94a3b8; }

  .cp-bcard-no {
    display: inline-block; font-family: 'Courier New', monospace;
    font-weight: 800; color: var(--gold-dark);
    font-size: 13px; margin-bottom: 5px;
    background: white; border: 1px solid var(--gold-border);
    border-radius: 7px; padding: 3px 9px;
  }
  .cp-bcard-meta {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font-size: 12px; color: var(--muted);
  }
  .cp-bcard-event { font-weight: 700; color: var(--text); font-size: 13px; }
  .cp-bcard-dot   { color: var(--gold-border); }
  .cp-bcard-date,
  .cp-bcard-hall  { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
  .cp-bcard-chevron { color: var(--gold-dark); display: flex; align-items: center; transition: var(--transition); }
  .cp-bcard-amount {
    font-size: 18px; font-weight: 900; color: var(--gold-dark);
    white-space: nowrap;
  }

  /* ── BADGES ── */
  .cp-badge {
    display: inline-flex; align-items: center;
    border-radius: 999px; padding: 5px 12px;
    font-size: 11.5px; font-weight: 800; text-transform: capitalize; white-space: nowrap;
  }
  .cp-badge-confirmed { background: var(--green-bg); color: var(--green); }
  .cp-badge-pending   { background: #fff3cd; color: #9a4b00; }
  .cp-badge-rejected,
  .cp-badge-cancelled,
  .cp-badge-failed    { background: var(--red-bg); color: #991b1b; }
  .cp-badge-default   { background: #f1f5f9; color: #475569; }

  /* ── EXPAND BODY ── */
  .cp-bcard-body {
    max-height: 0; overflow: hidden;
    transition: max-height 0.5s cubic-bezier(.4,0,.2,1);
    border-top: 0px solid var(--gold-border);
  }
  .cp-bcard-body.open {
    max-height: 1200px;
    border-top: 1px solid var(--gold-border);
  }
  .cp-bcard-body-inner { padding: 22px 20px; }

  .cp-section-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 11.5px; font-weight: 800; color: var(--gold-dark);
    text-transform: uppercase; letter-spacing: .8px;
    margin: 18px 0 12px;
  }
  .cp-section-label:first-child { margin-top: 0; }
  .cp-section-icon { display: flex; align-items: center; color: var(--gold-dark); }
  .cp-section-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--gold-border), transparent); }

  .cp-binfo-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px;
    margin-bottom: 4px;
  }

  .cp-chip {
    background: #fffdf9; border: 1px solid #f0e6c8;
    border-radius: 13px; padding: 12px 14px;
    transition: var(--transition);
  }
  .cp-chip:hover { background: var(--gold-pale); border-color: var(--gold-border); }
  .cp-chip-full      { grid-column: 1 / -1; }
  .cp-chip-highlight {
    background: linear-gradient(135deg, #fffdf0, var(--gold-pale));
    border-color: var(--gold-border);
  }
  .cp-chip-label {
    display: block; font-size: 10.5px; font-weight: 700;
    color: var(--muted); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px;
  }
  .cp-chip-value {
    display: flex; align-items: center; gap: 5px;
    font-size: 13px; font-weight: 600; color: var(--text); word-break: break-word;
  }
  .cp-chip-highlight .cp-chip-value { font-size: 15px; font-weight: 900; color: var(--gold-dark); }
  .cp-chip-icon { display: flex; align-items: center; color: var(--gold-dark); flex-shrink: 0; }

  .cp-bcard-actions {
    display: flex; align-items: center; gap: 14px;
    margin-top: 20px; padding-top: 16px;
    border-top: 1px solid var(--gold-border);
    flex-wrap: wrap;
  }
  .cp-edit-note {
    display: flex; align-items: center; gap: 7px;
    font-size: 12.5px; color: var(--muted); font-weight: 500;
  }

  /* ══ MODAL ══ */
  .cp-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    z-index: 100; display: flex; align-items: center; justify-content: center;
    padding: 20px; backdrop-filter: blur(4px);
    animation: overlayIn .25s ease;
  }
  @keyframes overlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .cp-modal {
    width: 100%; max-width: 580px; background: white;
    border-radius: 24px; border: 1px solid var(--gold-border);
    box-shadow: 0 24px 70px rgba(0,0,0,.22); overflow: hidden;
    animation: modalIn .3s cubic-bezier(.4,0,.2,1);
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(.94) translateY(16px); }
    to   { opacity: 1; transform: scale(1)   translateY(0); }
  }
  .cp-modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 16px; padding: 24px 24px 20px;
    border-bottom: 1px solid var(--gold-border);
    background: linear-gradient(135deg, var(--gold-pale), transparent);
  }
  .cp-modal-title-wrap { display: flex; align-items: center; gap: 14px; }
  .cp-modal-icon {
    width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
    background: linear-gradient(135deg,var(--gold-dark),var(--gold));
    color: white; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(143,105,8,.28);
  }
  .cp-modal-header h3 { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
  .cp-modal-header p  { font-size: 12px; color: var(--muted); }
  .cp-modal-close {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--red-bg); border: 1px solid #f5c6cb;
    color: var(--red); cursor: pointer; transition: var(--transition); flex-shrink: 0;
  }
  .cp-modal-close:hover { background: var(--red); color: white; transform: scale(1.1); }
  .cp-modal-form { padding: 24px; }
  .cp-modal-footer {
    display: flex; justify-content: flex-end; gap: 10px;
    padding-top: 18px; margin-top: 4px;
    border-top: 1px solid var(--gold-border);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .cp-binfo-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  }

  @media (max-width: 820px) {
    .cp-profile-grid  { grid-template-columns: 1fr; }
    .cp-form-row      { grid-template-columns: 1fr; }
    .cp-hero-stats    { display: none; }
    .cp-binfo-grid    { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .cp-hero-text h1  { font-size: 22px; }
  }

  @media (max-width: 560px) {
    .cp-topbar-inner { height: auto; padding: 13px 0; flex-direction: column; align-items: flex-start; }
    .cp-nav-actions  { width: 100%; }
    .cp-nav-actions .cp-btn { flex: 1; justify-content: center; }
    .cp-binfo-grid   { grid-template-columns: 1fr; }
    .cp-bcard-header { flex-direction: column; align-items: flex-start; }
    .cp-bcard-header-right { width: 100%; justify-content: space-between; }
    .cp-tabs         { width: 100%; }
    .cp-tab          { flex: 1; justify-content: center; }
    .cp-hero-inner   { gap: 14px; }
    .cp-hero-avatar  { width: 60px; height: 60px; font-size: 24px; }
  }
`;