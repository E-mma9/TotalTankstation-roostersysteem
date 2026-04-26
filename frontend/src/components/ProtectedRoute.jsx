import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (user.mustChangePassword && location.pathname !== '/wachtwoord-wijzigen') {
    return <Navigate to="/wachtwoord-wijzigen" replace />;
  }

  return children;
}
