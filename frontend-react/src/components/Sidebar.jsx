import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const ADMIN_TOKEN_KEY = "dlc_admin_token_v1";
const ADMIN_USER_KEY = "dlc_admin_user_v1";

function getStoredAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function logoutAdminRequest() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/admin/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Even if backend logout fails, local logout must happen.
  }
}

function IconReport({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 15l4-4 3 3 5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBars({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconFile({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 3v6h6M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconEdit({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconUsers({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronLeft({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const adminSidebarStyles = String.raw`
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
    transition: width var(--transition), padding var(--transition);
  }

  .admin-sidebar.collapsed {
    width: 84px;
    padding: 22px 12px;
  }

  .sidebar-collapse-btn {
    position: absolute;
    top: 28px;
    right: -14px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--gold-border);
    background: var(--white);
    color: var(--gold-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 501;
  }

  .sidebar-collapse-btn svg {
    transition: transform var(--transition);
  }

  .admin-sidebar.collapsed .sidebar-collapse-btn svg {
    transform: rotate(180deg);
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    padding: 8px 8px 18px;
    border-bottom: 1px solid var(--gold-border);
    min-width: 0;
  }

  .sidebar-title {
    display: block;
    color: var(--gold-dark);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-sidebar.collapsed .sidebar-brand {
    justify-content: center;
    padding: 8px 0 18px;
  }

  .admin-sidebar.collapsed .sidebar-title,
  .admin-sidebar.collapsed .sidebar-admin-meta,
  .admin-sidebar.collapsed .sidebar-section-title,
  .admin-sidebar.collapsed .link-label {
    display: none;
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

  .admin-sidebar.collapsed .sidebar-admin-card {
    justify-content: center;
    padding: 10px 6px;
    gap: 0;
  }

  .admin-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-dark), var(--gold));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 800;
    flex-shrink: 0;
    box-shadow: 0 6px 16px var(--gold-glow);
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

  .link-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .admin-sidebar.collapsed .sidebar-link,
  .admin-sidebar.collapsed .sidebar-logout {
    justify-content: center;
    padding: 12px;
    gap: 0;
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

  .sidebar-logout:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
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

  @media (min-width: 981px) {
    body.admin-sidebar-collapsed .admin-main {
      margin-left: 84px !important;
    }
  }

  @media (max-width: 980px) {
    .admin-sidebar {
      transform: translateX(-105%);
      transition: transform var(--transition);
    }

    .admin-sidebar.open {
      transform: translateX(0);
    }

    .admin-sidebar.collapsed {
      width: 286px;
      padding: 22px 18px;
    }

    .sidebar-collapse-btn {
      display: none;
    }

    .admin-main {
      margin-left: 0;
    }

    .admin-mobile-topbar {
      display: flex;
    }
  }

  @media (max-width: 560px) {
    .admin-sidebar {
      width: 275px;
      padding: 18px 14px;
    }
  }
`;

const SIDEBAR_COLLAPSED_KEY = "dlc_admin_sidebar_collapsed_v1";

export default function Sidebar({ admin: adminProp = null }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");

  useEffect(() => {
    document.body.classList.toggle("admin-sidebar-collapsed", collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");

    return () => document.body.classList.remove("admin-sidebar-collapsed");
  }, [collapsed]);

  const admin = adminProp || getStoredAdmin();

  const adminName = admin?.name || admin?.full_name || "Admin";

  const adminInitial = useMemo(() => {
    return (adminName || "A").charAt(0).toUpperCase();
  }, [adminName]);

  const isActive = (path) => location.pathname === path;
  const isActiveGroup = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapsed = () => setCollapsed((value) => !value);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    await logoutAdminRequest();

    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);

    setIsLoggingOut(false);
    navigate("/admin-login", { replace: true });
  }

  return (
    <>
      <style>{adminSidebarStyles}</style>

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`.trim()}>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconChevronLeft size={16} />
        </button>

        <Link to="/" className="sidebar-brand" onClick={closeSidebar} title="Elite Convention Hall">
          <span className="sidebar-title">Admin Portal</span>
        </Link>

        <div className="sidebar-admin-card">
          <div className="admin-avatar">{adminInitial}</div>
          <div className="sidebar-admin-meta">
            <span className="sidebar-admin-label">Signed in as</span>
            <span className="sidebar-admin-name">{adminName}</span>
          </div>
        </div>

        <div className="sidebar-menu">
          <div className="sidebar-section-title">Dashboard</div>

          <Link
            to="/admin-dashboard"
            className={`sidebar-link ${isActive("/admin-dashboard") ? "active" : ""}`.trim()}
            onClick={closeSidebar}
            title="Overview"
          >
            <IconBars size={15} />
            <span className="link-label">Overview</span>
          </Link>

          <Link
            to="/admin-bookings"
            className={`sidebar-link ${isActive("/admin-bookings") ? "active" : ""}`.trim()}
            onClick={closeSidebar}
            title="Bookings"
          >
            <IconFile size={15} />
            <span className="link-label">Bookings</span>
          </Link>

          <Link
            to="/admin-customers"
            className={`sidebar-link ${isActiveGroup("/admin-customers") ? "active" : ""}`.trim()}
            onClick={closeSidebar}
            title="Customers"
          >          
            <IconUsers size={15} />
            <span className="link-label">Customers</span>
           </Link>
           <Link
             to="/admin-reports"
             className={`sidebar-link ${isActive("/admin-reports") ? "active" : ""}`.trim()}
             onClick={closeSidebar}
             title="Reports"
           >
            <IconReport size={15} />
            <span className="link-label">Reports</span>
          </Link>


          <Link
            to="/admin-manual-booking"
            className={`sidebar-link ${isActive("/admin-manual-booking") ? "active" : ""}`.trim()}
            onClick={closeSidebar}
            title="Manual Booking"
          >
            <IconPlus size={15} />
            <span className="link-label">Manual Booking</span>
          </Link>

          <Link
            to="/admin-homepage-content"
            className={`sidebar-link ${isActive("/admin-homepage-content") ? "active" : ""}`.trim()}
            onClick={closeSidebar}
            title="Homepage Content"
          >
            <IconEdit size={15} />
            <span className="link-label">Homepage Content</span>
          </Link>

          <Link
            to="/admin-calendar-slots"
            className={`sidebar-link ${isActive("/admin-calendar-slots") ? "active" : ""}`.trim()}
            onClick={closeSidebar}
            title="Calendar Slots"
          >
            <IconCalendar size={15} />
            <span className="link-label">Calendar Slots</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Logout"
          >
            <IconLogout size={15} />
            <span className="link-label">{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      <div
        className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`.trim()}
        onClick={closeSidebar}
      />

      <div className="admin-mobile-topbar">
        <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <img src="/assets/img/ECH-02.png" alt="Elite Convention Hall" />
      </div>
    </>
  );
}