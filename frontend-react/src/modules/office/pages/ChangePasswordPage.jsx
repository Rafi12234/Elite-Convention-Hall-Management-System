import { Navigate, useNavigate } from "react-router-dom";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { changeEmployeePassword, loadCurrentEmployee } from "../services/authStorage";

// Dedicated route for the mandatory first-login password change. Reached
// via redirect from RequirePasswordChange (or directly from LoginPage)
// whenever mustChangePassword is still true for the logged-in employee.
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const employee = loadCurrentEmployee();

  if (!employee) {
    return <Navigate to="/office/login" replace />;
  }
  if (!employee.mustChangePassword) {
    return <Navigate to="/office/management" replace />;
  }

  async function handleChangePassword(credentials) {
    await changeEmployeePassword(credentials);
    navigate("/office/management", { replace: true });
  }

  return (
    <div className="min-h-screen bg-black">
      <ChangePasswordModal onSuccess={handleChangePassword} />
    </div>
  );
}
