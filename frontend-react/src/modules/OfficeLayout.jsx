import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

/**
 * Scope wrapper for every office-module route. The ported MME styles and the
 * scoped Tailwind preflight in office-modules.css both key off .office-app,
 * which keeps them from leaking into the booking site.
 *
 * Scroll handling lives here rather than globally so the booking site keeps
 * the browser default: ManagementPage restores its own remembered position,
 * every other office page starts at the top.
 */
export default function OfficeLayout() {
  const location = useLocation();

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return undefined;

    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = "auto";
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/office/management") return;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="office-app">
      <Outlet />
    </div>
  );
}
