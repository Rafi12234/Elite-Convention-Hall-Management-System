import { Navigate, Route } from "react-router-dom";

import LandingPage from "./office/pages/LandingPage";
import LoginPage from "./office/pages/LoginPage";
import ChangePasswordPage from "./office/pages/ChangePasswordPage";
import ManagementPage from "./office/pages/ManagementPage";
import ClientMeetingsPage from "./office/pages/ClientMeetingsPage";
import ClientCallsPage from "./office/pages/ClientCallsPage";
import CalendarPage from "./office/pages/CalendarPage";
import CalendarDayPage from "./office/pages/CalendarDayPage";

import AccountsPage from "./accounts/pages/AccountsPage";
import MoneyInPage from "./accounts/pages/MoneyInPage";
import LogCostPage from "./accounts/pages/LogCostPage";
import VendorsPage from "./accounts/pages/VendorsPage";
import VendorProfilePage from "./accounts/pages/VendorProfilePage";

import AdminPage from "./office/pages/admin/AdminPage";
import AdminDashboardPage from "./office/pages/admin/AdminDashboardPage";
import AdminClientDetailPage from "./office/pages/admin/AdminClientDetailPage";
import AdminLoginPage from "./office/pages/admin/AdminLoginPage";
import AdminActivityPage from "./office/pages/admin/AdminActivityPage";
import AdminEmployeeDetailPage from "./office/pages/admin/AdminEmployeeDetailPage";
import AdminEmployeeMissedPage from "./office/pages/admin/AdminEmployeeMissedPage";
import AdminEmployeeAccountsPage from "./office/pages/admin/AdminEmployeeAccountsPage";
import AdminMeetingDetailsPage from "./office/pages/admin/AdminMeetingDetailsPage";
import AdminCallDetailsPage from "./office/pages/admin/AdminCallDetailsPage";
import AdminCalendarPage from "./office/pages/admin/AdminCalendarPage";
import AdminCalendarDayPage from "./office/pages/admin/AdminCalendarDayPage";
import AdminClientsManagementPage from "./office/pages/admin/AdminClientsManagementPage";
import AdminAttendancePage from "./office/pages/admin/AdminAttendancePage";

import AdminAccountsEmployeesPage from "./office/pages/admin/accounts/AdminAccountsEmployeesPage";
import AdminAccountsEmployeeProfilePage from "./office/pages/admin/accounts/AdminAccountsEmployeeProfilePage";
import AdminAccountsMoneyInPage from "./office/pages/admin/accounts/AdminAccountsMoneyInPage";
import AdminAccountsBillsPage from "./office/pages/admin/accounts/AdminAccountsBillsPage";
import AdminAccountsExpensesPage from "./office/pages/admin/accounts/AdminAccountsExpensesPage";
import AdminAccountsExpenseDetailPage from "./office/pages/admin/accounts/AdminAccountsExpenseDetailPage";
import AdminAccountsVendorsPage from "./office/pages/admin/accounts/AdminAccountsVendorsPage";
import AdminAccountsVendorProfilePage from "./office/pages/admin/accounts/AdminAccountsVendorProfilePage";

import RedirectIfAuthed from "./office/components/RedirectIfAuthed";
import RequirePasswordChange from "./office/components/RequirePasswordChange";
import BlockIfEmployeeSession from "./office/components/BlockIfEmployeeSession";

/**
 * Routes for the Office Management, Accounts and Attendance modules.
 *
 * Everything is namespaced under /office so it can't collide with the
 * booking site's own "/", "/login", "/change-password" and "/admin-*"
 * routes. Returned as a fragment of <Route> elements so App.jsx can spread
 * them into its single <Routes> tree.
 */
export default function OfficeRoutes() {
  return (
    <>
      <Route path="/office" element={<RedirectIfAuthed><LandingPage /></RedirectIfAuthed>} />
      <Route path="/office/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
      <Route path="/office/change-password" element={<ChangePasswordPage />} />

      <Route path="/office/management" element={<RequirePasswordChange><ManagementPage /></RequirePasswordChange>} />
      <Route path="/office/management/meetings/:rowKey" element={<RequirePasswordChange><ClientMeetingsPage /></RequirePasswordChange>} />
      <Route path="/office/management/calls/:rowKey" element={<RequirePasswordChange><ClientCallsPage /></RequirePasswordChange>} />
      <Route path="/office/calendar" element={<RequirePasswordChange><CalendarPage /></RequirePasswordChange>} />
      <Route path="/office/calendar/day/:date" element={<RequirePasswordChange><CalendarDayPage /></RequirePasswordChange>} />

      <Route path="/office/accounts" element={<RequirePasswordChange><AccountsPage /></RequirePasswordChange>} />
      <Route path="/office/accounts/money-in" element={<RequirePasswordChange><MoneyInPage /></RequirePasswordChange>} />
      <Route path="/office/accounts/log-cost" element={<RequirePasswordChange><LogCostPage /></RequirePasswordChange>} />
      <Route path="/office/accounts/vendors" element={<RequirePasswordChange><VendorsPage /></RequirePasswordChange>} />
      <Route path="/office/accounts/vendors/:id" element={<RequirePasswordChange><VendorProfilePage /></RequirePasswordChange>} />

      <Route path="/office/admin" element={<Navigate to="/office/admin-dashboard" replace />} />
      <Route path="/office/admin-dashboard" element={<BlockIfEmployeeSession><AdminDashboardPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin-dashboard/clients/:rowKey" element={<BlockIfEmployeeSession><AdminClientDetailPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin-employee-management" element={<BlockIfEmployeeSession><AdminPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin-employee-management/accounts" element={<BlockIfEmployeeSession><AdminEmployeeAccountsPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin-employee-management/:employeeId/missed" element={<BlockIfEmployeeSession><AdminEmployeeMissedPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin-employee-management/:employeeId" element={<BlockIfEmployeeSession><AdminEmployeeDetailPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/login" element={<BlockIfEmployeeSession><AdminLoginPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/activity" element={<BlockIfEmployeeSession><AdminActivityPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/activity/meetings/:rowKey" element={<BlockIfEmployeeSession><AdminMeetingDetailsPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/activity/calls/:rowKey" element={<BlockIfEmployeeSession><AdminCallDetailsPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/calendar" element={<BlockIfEmployeeSession><AdminCalendarPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/calendar/day/:date" element={<BlockIfEmployeeSession><AdminCalendarDayPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/clients-management" element={<BlockIfEmployeeSession><AdminClientsManagementPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/attendance" element={<BlockIfEmployeeSession><AdminAttendancePage /></BlockIfEmployeeSession>} />

      {/* Financial accounts — distinct from /office/admin-employee-management/accounts,
          which manages employee login accounts rather than money. */}
      <Route path="/office/admin/accounts" element={<Navigate to="/office/admin/accounts/money-in" replace />} />
      <Route path="/office/admin/accounts/employees" element={<BlockIfEmployeeSession><AdminAccountsEmployeesPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/employees/:employeeId" element={<BlockIfEmployeeSession><AdminAccountsEmployeeProfilePage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/money-in" element={<BlockIfEmployeeSession><AdminAccountsMoneyInPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/bills" element={<BlockIfEmployeeSession><AdminAccountsBillsPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/expenses" element={<BlockIfEmployeeSession><AdminAccountsExpensesPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/expenses/:expenseId" element={<BlockIfEmployeeSession><AdminAccountsExpenseDetailPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/vendors" element={<BlockIfEmployeeSession><AdminAccountsVendorsPage /></BlockIfEmployeeSession>} />
      <Route path="/office/admin/accounts/vendors/:vendorId" element={<BlockIfEmployeeSession><AdminAccountsVendorProfilePage /></BlockIfEmployeeSession>} />
    </>
  );
}
