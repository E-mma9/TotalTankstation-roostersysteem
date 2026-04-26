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
      navigate(data.user.mustChangePassword ? '/wachtwoord-wijzigen' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#F7F6F3' }}
    >
      <div className="w-full max-w-sm" style={{ animation: 'fadeUp 0.4s ease both' }}>

        {/* Brand mark */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-black text-2xl mb-4"
            style={{
              background: '#EA580C',
              boxShadow: '0 4px 16px rgba(234,88,12,0.30)',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            T
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Syne, sans-serif', color: '#1A1916', letterSpacing: '-0.03em' }}
          >
            Total Tankstation
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A09890' }}>Roostersysteem</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                   style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full" style={{ padding: '0.75rem 1.25rem', fontSize: '0.9375rem' }}>
              {loading
                ? <><span className="opacity-60">Inloggen</span><span className="animate-pulse">…</span></>
                : 'Inloggen'}
            </button>
          </form>

          <div className="mt-5 pt-5 text-center text-sm" style={{ borderTop: '1px solid #E8E3DA' }}>
            <Link to="/forgot-password"
                  className="font-medium transition-colors"
                  style={{ color: '#EA580C' }}
                  onMouseOver={(e) => e.target.style.color = '#C2410C'}
                  onMouseOut={(e) => e.target.style.color = '#EA580C'}>
              Wachtwoord vergeten?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
