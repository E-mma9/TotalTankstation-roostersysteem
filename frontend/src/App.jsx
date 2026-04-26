import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/auth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ManagerRoute from './components/ManagerRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Colleagues from './pages/Colleagues';
import Availability from './pages/Availability';
import LeaveRequests from './pages/LeaveRequests';
import ShiftSwaps from './pages/ShiftSwaps';
import Notifications from './pages/Notifications';
import ManagerSchedule from './pages/manager/Schedule';
import ManagerEmployees from './pages/manager/Employees';
import ManagerRequests from './pages/manager/Requests';

export default function App() {
  const { setAuth, clear, setInitialized, isInitializing } = useAuthStore();

  useEffect(() => {
    authApi
      .refresh()
      .then((data) => setAuth(data.accessToken, data.user))
      .catch(() => clear())
      .finally(() => setInitialized());
  }, [setAuth, clear, setInitialized]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-500">Laden...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/collegas" element={<Colleagues />} />
        <Route path="/beschikbaarheid" element={<Availability />} />
        <Route path="/vrije-dagen" element={<LeaveRequests />} />
        <Route path="/dienstruil" element={<ShiftSwaps />} />
        <Route path="/notificaties" element={<Notifications />} />
        <Route path="/wachtwoord-wijzigen" element={<ChangePassword />} />
        <Route element={<ManagerRoute />}>
          <Route path="/manager/rooster" element={<ManagerSchedule />} />
          <Route path="/manager/medewerkers" element={<ManagerEmployees />} />
          <Route path="/manager/verzoeken" element={<ManagerRequests />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
