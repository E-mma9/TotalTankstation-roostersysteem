import { useEffect, useState } from 'react';
import { usersApi } from '../../api/resources';

export default function ManagerEmployees() {
  const [users, setUsers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'MEDEWERKER' });
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  function load() {
    usersApi.list(showInactive).then(setUsers);
  }

  useEffect(() => { load(); }, [showInactive]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    try {
      await usersApi.create(form);
      setForm({ email: '', firstName: '', lastName: '', role: 'MEDEWERKER' });
      setShowForm(false);
      setFeedback(`${form.firstName} is aangemaakt en ontvangt een e-mail met inloggegevens.`);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Aanmaken mislukt');
    }
  }

  async function toggleActive(u) {
    if (u.isActive) {
      if (!confirm(`${u.firstName} ${u.lastName} uit dienst zetten?\nHistorische roosters blijven bewaard.`)) return;
      await usersApi.update(u.id, { isActive: false });
    } else {
      await usersApi.update(u.id, { isActive: true, employmentEndDate: null });
    }
    load();
  }

  async function resendInvite(u) {
    if (!confirm(`Nieuw tijdelijk wachtwoord sturen naar ${u.email}?`)) return;
    await usersApi.resendInvite(u.id);
    setFeedback(`Nieuwe uitnodiging verstuurd naar ${u.email}`);
  }

  const active = users.filter((u) => u.isActive);
  const inactive = users.filter((u) => !u.isActive);

  function UserCard({ u, isInactive = false }) {
    return (
      <div className={`card flex flex-wrap items-center gap-4 ${isInactive ? 'opacity-60' : ''}`}>
        <div className="avatar w-12 h-12 text-base shrink-0">
          {u.firstName.charAt(0)}{u.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg leading-tight">{u.firstName} {u.lastName}</p>
          <p className="text-sm text-slate-500">{u.email}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${
          u.role === 'MANAGER'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {u.role === 'MANAGER' ? 'Manager' : 'Medewerker'}
        </span>
        <div className="flex gap-2 shrink-0">
          {isInactive ? (
            <button onClick={() => toggleActive(u)} className="btn-secondary">
              Reactiveren
            </button>
          ) : (
            <>
              <button onClick={() => resendInvite(u)} className="btn-secondary">
                Reset wachtwoord
              </button>
              <button onClick={() => toggleActive(u)} className="btn-danger">
                Uit dienst
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Medewerkers</h1>
        <button onClick={() => { setShowForm((v) => !v); setFormError(''); }} className="btn-primary">
          {showForm ? 'Annuleren' : '+ Nieuwe medewerker'}
        </button>
      </div>

      {feedback && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-green-800 font-medium flex items-center justify-between">
          {feedback}
          <button onClick={() => setFeedback('')} className="text-green-600 hover:text-green-800 text-lg leading-none">×</button>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-lg mb-4">Nieuwe medewerker toevoegen</h2>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Voornaam</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Achternaam</label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">E-mailadres</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="MEDEWERKER">Medewerker</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            {formError && (
              <p className="text-base text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2 sm:col-span-2">{formError}</p>
            )}
            <div className="sm:col-span-2 flex items-center gap-4">
              <button type="submit" className="btn-primary">
                Aanmaken & uitnodigen
              </button>
              <p className="text-sm text-slate-500">
                De medewerker ontvangt een e-mail met een tijdelijk wachtwoord.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* Actieve medewerkers */}
      <div className="space-y-3 mb-6">
        {active.length === 0 ? (
          <div className="card text-slate-500">Geen actieve medewerkers.</div>
        ) : (
          active.map((u) => <UserCard key={u.id} u={u} />)
        )}
      </div>

      {/* Voormalige medewerkers toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none mb-3">
        <input
          type="checkbox"
          className="w-5 h-5 rounded accent-brand-600 cursor-pointer"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        <span className="text-base text-slate-600">Toon voormalige medewerkers ({inactive.length})</span>
      </label>

      {showInactive && inactive.length > 0 && (
        <div className="space-y-3">
          {inactive.map((u) => <UserCard key={u.id} u={u} isInactive />)}
        </div>
      )}
    </div>
  );
}
