import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(email, password);
      setAuth(data.accessToken, data.user);
      if (data.user.mustChangePassword) navigate('/wachtwoord-wijzigen');
      else if (data.user.role === 'MANAGER') navigate('/manager/rooster');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white font-bold text-2xl mb-4 shadow-md">
            T
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Total Tankstation</h1>
          <p className="text-sm text-slate-500 mt-1">Roostersysteem</p>
        </div>

        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mailadres</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@tankstation.nl"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Wachtwoord</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full" style={{ paddingTop: '0.625rem', paddingBottom: '0.625rem' }}>
              {loading ? 'Inloggen...' : 'Inloggen'}
            </button>
          </form>

          <div className="mt-4 pt-4 text-center text-sm border-t border-slate-100">
            <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-medium">
              Wachtwoord vergeten?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
