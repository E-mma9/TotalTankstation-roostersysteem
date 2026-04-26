import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ManagerRoute() {
  const { user } = useAuthStore();
  if (user?.role !== 'MANAGER') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
