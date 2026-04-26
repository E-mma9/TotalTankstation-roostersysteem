import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function EmployeeRoute() {
  const { user } = useAuthStore();
  if (user?.role === 'MANAGER') return <Navigate to="/manager/rooster" replace />;
  return <Outlet />;
}
