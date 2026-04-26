import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (next !== confirm) return setError('Wachtwoorden komen niet overeen');
    if (next.length < 8) return setError('Minimaal 8 tekens');
    setLoading(true);
    setError('');
    try {
      await authApi.changePassword(current, next);
      setUser({ ...user, mustChangePassword: false });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Wijzigen mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Wachtwoord wijzigen</h1>
      {user?.mustChangePassword && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          Je moet je tijdelijke wachtwoord wijzigen voordat je verder kunt.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Huidig wachtwoord</label>
          <input
            type="password"
            className="input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Nieuw wachtwoord</label>
          <input
            type="password"
            className="input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="label">Bevestig nieuw wachtwoord</label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>
    </div>
  );
}
