import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await authApi.forgotPassword(email);
    } catch {}
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card">
        <h1 className="text-xl font-semibold mb-4">Wachtwoord vergeten</h1>
        {submitted ? (
          <>
            <p className="text-sm text-slate-700 mb-4">
              Als het e-mailadres bekend is, ontvang je binnen enkele minuten een reset-link.
            </p>
            <Link to="/login" className="text-brand-600 hover:underline text-sm">
              Terug naar inloggen
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Reset-link sturen
            </button>
            <Link to="/login" className="block text-center text-sm text-brand-600 hover:underline">
              Terug naar inloggen
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
